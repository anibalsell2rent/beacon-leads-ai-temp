import { hasuraQuery } from "../utils/hasura.client";

export interface PipelineFilters {
  searchQuery?: string;
  stageIds?: string[];
  memberIds?: string[];
  memberEmail?: string;
  advisorId?: string;
  managerId?: string;
  advisorEmail?: string;
  managerEmail?: string;
  stageId?: string;
  isHot?: boolean;
  search?: string;
  stages?: string[];
  fetchLimitPerStage?: number;
}

// ─── Note: zoho_user_id can be very large (> 2^31), store & pass as String ───

// ─── Identity resolution ───────────────────────────────────────────────────────

/**
 * Given an email, UUID, or numeric zoho_user_id, returns all IDs
 * (UUID id only) associated with that user.
 * Note: zoho_user_id may exceed Int range in Hasura, so we only use UUID.
 */
async function resolveToIds(val: string): Promise<string[]> {
  if (!val) return [];

  let whereClause: any;

  if (val.includes("@")) {
    whereClause = { email: { _eq: val.trim() } };
  } else if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
  ) {
    whereClause = { id: { _eq: val } };
  } else if (/^\d+$/.test(val)) {
    // zoho_user_id can exceed Int32 range; look up by it but only return UUID
    whereClause = {
      _or: [{ zoho_user_id: { _eq: val } }],
    };
  } else {
    return [val];
  }

  const data = await hasuraQuery<{
    users: { id: string; zoho_user_id: string | null }[];
  }>(
    `
    query ResolveUser($where: users_bool_exp!) {
      users(where: $where, limit: 1) { id zoho_user_id }
    }
  `,
    { where: whereClause }
  );

  const u = data.users[0];
  if (u) {
    // Return only UUID to avoid passing oversized zoho_user_id to Hasura [Int!]!
    return u.id ? [u.id] : [];
  }
  return [val];
}

// ─── Service ───────────────────────────────────────────────────────────────────

export class PipelineService {
  static async getPipelineLeads(
    filters: PipelineFilters,
    limit: number = 50,
    offset: number = 0
  ) {
    // 0. Resolve identities
    let filteredAdvisorIds: string[] = [];
    let filteredManagerIds: string[] = [];

    if (filters.advisorEmail) {
      filteredAdvisorIds = await resolveToIds(filters.advisorEmail.trim());
    }
    if (filters.managerEmail) {
      filteredManagerIds = await resolveToIds(filters.managerEmail.trim());
    }
    if (filters.memberEmail) {
      const ids = await resolveToIds(filters.memberEmail.trim());
      if (ids.length > 0) {
        if (!filters.memberIds) filters.memberIds = [];
        filters.memberIds.push(...ids);
      }
    }

    // Expand memberIds to all forms (UUID + zoho_user_id)
    let expandedMemberIds: string[] = [];
    if (filters.memberIds && filters.memberIds.length > 0) {
      for (const id of filters.memberIds) {
        const ids = await resolveToIds(id);
        expandedMemberIds.push(...ids);
      }
    }

    // 1. Resolve stage IDs from names
    let resolvedStageIds: string[] = [];
    if (filters.stages && filters.stages.length > 0) {
      const stageData = await hasuraQuery<{
        crm_stages: { id: string }[];
      }>(
        `
        query ResolveStages($names: [String!]!) {
          crm_stages(where: { name: { _in: $names } }) { id }
        }
      `,
        { names: filters.stages }
      );

      resolvedStageIds = stageData.crm_stages.map((s) => s.id);
      if (resolvedStageIds.length === 0) {
        return { leads: [], totalCount: 0, stageCounts: [] };
      }
    }

    // 2. Build the Hasura where clause for crm_leads
    const andClauses: any[] = [];

    // Stage filter
    const allStageIds: string[] = [];
    if (filters.stageId) {
      allStageIds.push(String(filters.stageId));
    } else {
      if (filters.stageIds && filters.stageIds.length > 0)
        allStageIds.push(...filters.stageIds.map(String));
      if (resolvedStageIds.length > 0) {
        if (allStageIds.length > 0) {
          const intersection = allStageIds.filter((id) =>
            resolvedStageIds.includes(id)
          );
          if (intersection.length === 0)
            return { leads: [], totalCount: 0, stageCounts: [] };
          allStageIds.length = 0;
          allStageIds.push(...intersection);
        } else {
          allStageIds.push(...resolvedStageIds);
        }
      }
    }
    if (allStageIds.length > 0) {
      andClauses.push({ stage_id: { _in: allStageIds } });
    }

    // Hot filter
    if (filters.isHot !== undefined && filters.isHot !== null) {
      andClauses.push({ is_hot: { _eq: filters.isHot } });
    }

    // Identity filters (advisor / manager / member)
    const identityOrClauses: any[] = [];

    if (expandedMemberIds.length > 0) {
      identityOrClauses.push({
        _or: [
          { seller_advisor_id: { _in: expandedMemberIds } },
          { seller_manager_id: { _in: expandedMemberIds } },
          { owner_id:          { _in: expandedMemberIds } },
        ],
      });
    }
    if (filteredAdvisorIds.length > 0) {
      identityOrClauses.push({
        _or: [
          { seller_advisor_id: { _in: filteredAdvisorIds } },
          { owner_id:          { _in: filteredAdvisorIds } },
          { seller_manager_id: { _in: filteredAdvisorIds } },
        ],
      });
    }
    if (filteredManagerIds.length > 0) {
      identityOrClauses.push({
        _or: [
          { seller_manager_id: { _in: filteredManagerIds } },
          { owner_id:          { _in: filteredManagerIds } },
          { seller_advisor_id: { _in: filteredManagerIds } },
        ],
      });
    }
    if (identityOrClauses.length > 0) {
      andClauses.push(...identityOrClauses);
    }

    const leadWhere = andClauses.length > 0 ? { _and: andClauses } : {};

    // 3. Fetch leads (with optional per-stage limit)
    let leads:       any[]                                  = [];
    let totalCount:  number                                 = 0;
    let stageCounts: { stageId: string; count: number }[]  = [];

    if (filters.fetchLimitPerStage) {
      // Fetch all available stage IDs
      const stagesData = await hasuraQuery<{ crm_stages: { id: string }[] }>(`
        query AllStageIds { crm_stages { id } }
      `);
      const activeStageIds =
        allStageIds.length > 0
          ? allStageIds
          : stagesData.crm_stages.map((s) => s.id);

      const perStageResults = await Promise.all(
        activeStageIds.map(async (stgId) => {
          const stgWhere = {
            _and: [...(leadWhere._and ?? []), { stage_id: { _eq: stgId } }],
          };
          const stgData = await hasuraQuery<{
            crm_leads: any[];
            crm_leads_aggregate: { aggregate: { count: number } };
          }>(
            `
            query StageLeads($where: crm_leads_bool_exp!, $limit: Int!, $offset: Int!) {
              crm_leads(where: $where, limit: $limit, offset: $offset, order_by: { last_updated: desc }) {
                id property_id stage_id seller_advisor_id seller_manager_id
                investor_advisor_id is_hot lead_score lead_final_score sellers_gross_equity
                seller_segment marketing_source lead_notes days_in_current_stage
                pipeline_type s2r_net_revenue cap_rate contract_price last_updated
                is_hot lead_number result
              }
              crm_leads_aggregate(where: $where) { aggregate { count } }
            }
          `,
            {
              where:  stgWhere,
              limit:  filters.fetchLimitPerStage,
              offset,
            }
          );
          return { stgId, rows: stgData.crm_leads, count: stgData.crm_leads_aggregate.aggregate.count };
        })
      );

      for (const { stgId, rows, count } of perStageResults) {
        leads.push(...rows);
        totalCount += count;
        stageCounts.push({ stageId: stgId, count });
      }
    } else {
      const leadsData = await hasuraQuery<{
        crm_leads: any[];
        crm_leads_aggregate: { aggregate: { count: number } };
      }>(
        `
        query PipelineLeads($where: crm_leads_bool_exp!, $limit: Int!, $offset: Int!) {
          crm_leads(where: $where, limit: $limit, offset: $offset, order_by: { last_updated: desc }) {
            id property_id stage_id seller_advisor_id seller_manager_id
            investor_advisor_id owner_id is_hot lead_score lead_final_score
            seller_segment marketing_source lead_notes days_in_current_stage
            pipeline_type s2r_net_revenue cap_rate contract_price last_updated
            lead_number result
          }
          crm_leads_aggregate(where: $where) { aggregate { count } }
        }
      `,
        { where: leadWhere, limit, offset }
      );

      leads      = leadsData.crm_leads;
      totalCount = leadsData.crm_leads_aggregate.aggregate.count;

      // Count per stage
      const stageCountData = await hasuraQuery<{
        crm_leads: { stage_id: string | null }[];
      }>(
        `
        query StageCountsOnly($where: crm_leads_bool_exp!) {
          crm_leads(where: $where) { stage_id }
        }
      `,
        { where: leadWhere }
      );

      const stageCountMap = new Map<string, number>();
      for (const l of stageCountData.crm_leads) {
        const sid = l.stage_id ? String(l.stage_id) : "_none";
        stageCountMap.set(sid, (stageCountMap.get(sid) ?? 0) + 1);
      }
      stageCounts = Array.from(stageCountMap.entries()).map(([stageId, count]) => ({
        stageId,
        count,
      }));
    }

    if (leads.length === 0) {
      return { leads: [], totalCount, stageCounts };
    }

    // 4. Extract IDs for batch fetching
    //
    // Actual DB types (verified against live Hasura schema):
    //   crm_leads.id                     → uuid    → [uuid!]!
    //   crm_sellers.lead_id              → uuid    → [uuid!]!
    //   crm_deals.lead_id                → uuid    → [uuid!]!
    //   properties.id                    → text    → [String!]!
    //   crm_property_*.property_id       → text    → [String!]!
    //   crm_leads.seller_advisor_id      → Int     → [Int!]!  (FK to users.id)
    //   crm_leads.seller_manager_id      → Int     → [Int!]!
    //   crm_leads.investor_advisor_id    → Int     → [Int!]!
    //   users.id                         → Int
    //   users.zoho_user_id               → String  → [String!]! (large values > 2^31)
    const leadIds     = leads.map((l: any) => String(l.id));
    const propertyIds = [...new Set(leads.map((l: any) => l.property_id).filter(Boolean))] as string[];

    // advisor/manager/investor IDs are integers (FK → users.id)
    const advisorIds         = [...new Set(leads.map((l: any) => l.seller_advisor_id).filter(Boolean))].map(Number);
    const managerIds         = [...new Set(leads.map((l: any) => l.seller_manager_id).filter(Boolean))].map(Number);
    const investorAdvisorIds = [...new Set(leads.map((l: any) => l.investor_advisor_id).filter(Boolean))].map(Number);
    const allUserIntIds      = [...new Set([...advisorIds, ...managerIds, ...investorAdvisorIds])];

    // 5. Batch fetch all relations in one query
    const relData = await hasuraQuery<{
      crm_sellers:               any[];
      crm_property_financials:   any[];
      crm_stages:                any[];
      properties:                any[];
      properties_lead_scoring:   any[];
      crm_deals:                 any[];
      crm_property_realtor_info: any[];
      users:                     any[];
    }>(
      `
      query PipelineRelations(
        $leadIds:     [uuid!]!
        $propertyIds: [String!]!
        $userIds:     [Int!]!
      ) {
        crm_sellers(where: { lead_id: { _in: $leadIds } }) {
          lead_id first_name last_name mailing_city mailing_state mailing_zip desired_timeline
        }
        crm_property_financials(where: { property_id: { _in: $propertyIds } }) {
          property_id is_in_foreclosure
        }
        crm_stages { id name }
        properties(where: { id: { _in: $propertyIds } }) {
          id address city state zip_code seller_name campaign_source price cap_rate
        }
        properties_lead_scoring(where: { property_id: { _in: $propertyIds } }) {
          property_id section seller_score property_score transaction_score investor_score s2r_fee
        }
        crm_deals(where: { lead_id: { _in: $leadIds } }) {
          lead_id offer_presented_date
        }
        crm_property_realtor_info(where: { property_id: { _in: $propertyIds } }) {
          property_id days_on_market
        }
        users(where: { id: { _in: $userIds } }) {
          id first_name last_name
        }
      }
    `,
      {
        leadIds,
        propertyIds:  propertyIds.length    > 0 ? propertyIds    : ["__none__"],
        userIds:      allUserIntIds.length   > 0 ? allUserIntIds  : [-1],
      }
    );

    // 6. Build lookup maps
    const sellersMap     = new Map(relData.crm_sellers.map((s: any)     => [s.lead_id, s]));
    const financialsMap  = new Map(relData.crm_property_financials.map((f: any) => [f.property_id, f]));
    const stagesMap      = new Map(relData.crm_stages.map((s: any)      => [String(s.id), s]));
    const propertiesMap  = new Map(relData.properties.map((p: any)      => [String(p.id), p]));
    const dealsMap       = new Map(relData.crm_deals.map((d: any)       => [d.lead_id, d]));
    const realtorInfoMap = new Map(relData.crm_property_realtor_info.map((r: any) => [r.property_id, r]));

    // users keyed by integer id (seller_advisor_id etc. are FK → users.id)
    const usersMap = new Map<number, any>();
    relData.users.forEach((u: any) => {
      usersMap.set(Number(u.id), u);
    });

    // Build score map
    const leadScoresMap = new Map<string, Record<string, number>>();
    relData.properties_lead_scoring.forEach((ls: any) => {
      const total = [ls.seller_score, ls.property_score, ls.transaction_score, ls.investor_score, ls.s2r_fee]
        .reduce((sum: number, v: any) => sum + (parseFloat(v) || 0), 0);
      if (!leadScoresMap.has(ls.property_id)) leadScoresMap.set(ls.property_id, {});
      leadScoresMap.get(ls.property_id)![ls.section] = Math.round(total);
    });

    // 7. Assemble final lead list
    let mappedLeads = leads.map((lead: any) => {
      const seller          = lead.id ? sellersMap.get(lead.id) : null;
      const property        = lead.property_id ? propertiesMap.get(String(lead.property_id)) : null;
      const financial       = lead.property_id ? financialsMap.get(String(lead.property_id)) : null;
      const advisorUser     = lead.seller_advisor_id   ? usersMap.get(Number(lead.seller_advisor_id))   : null;
      const managerUser     = lead.seller_manager_id   ? usersMap.get(Number(lead.seller_manager_id))   : null;
      const invAdvisorUser  = lead.investor_advisor_id ? usersMap.get(Number(lead.investor_advisor_id)) : null;
      const stage           = lead.stage_id ? stagesMap.get(String(lead.stage_id)) : null;
      const deal            = lead.id ? dealsMap.get(lead.id) : null;

      let leadName = "Unknown Seller";
      if (seller && (seller.first_name || seller.last_name)) {
        leadName = `${seller.first_name ?? ""} ${seller.last_name ?? ""}`.trim();
      } else if ((property as any)?.seller_name) {
        leadName = (property as any).seller_name;
      }

      // Address fallback parser
      let parsedCity  = (property as any)?.city  ?? (seller as any)?.mailing_city  ?? null;
      let parsedState = (property as any)?.state ?? (seller as any)?.mailing_state ?? null;
      let parsedZip   = (property as any)?.zip_code ?? (seller as any)?.mailing_zip ?? null;

      if ((property as any)?.address && (!parsedCity || !parsedState || !parsedZip)) {
        const parts    = (property as any).address.split(",").map((s: string) => s.trim()).filter(Boolean);
        const lastPart = parts[parts.length - 1];
        const match    = lastPart?.match(/^([A-Z]{2})\s+(\d{5}(-\d{4})?)$/i);
        if (match) {
          if (!parsedState) parsedState = match[1].toUpperCase();
          if (!parsedZip)   parsedZip   = match[2];
          if (!parsedCity && parts.length >= 2) parsedCity = parts[parts.length - 2];
        }
      }

      const scoreData = lead.property_id ? leadScoresMap.get(lead.property_id) : null;
      const leadScoreNum = scoreData
        ? Math.round(scoreData.final || scoreData.initial || 0)
        : Math.round(lead.lead_score || lead.lead_final_score || 0);

      return {
        id:                   lead.id,
        leadName,
        state:                parsedState,
        city:                 parsedCity,
        score:                leadScoreNum,
        lead_score:           leadScoreNum,
        seller_segment:       lead.seller_segment       ?? null,
        source:               (property as any)?.campaign_source ?? lead.marketing_source ?? null,
        contractPrice:        (property as any)?.price
          ? parseFloat((property as any).price)
          : lead.contract_price ? parseFloat(lead.contract_price) : null,
        capRate:              (property as any)?.cap_rate
          ? parseFloat((property as any).cap_rate)
          : lead.cap_rate ? parseFloat(lead.cap_rate) : null,
        equity:               lead.sellers_gross_equity
          ? parseFloat(lead.sellers_gross_equity)
          : 0,
        advisorName:          advisorUser
          ? `${advisorUser.first_name ?? ""} ${advisorUser.last_name ?? ""}`.trim()
          : null,
        managerName:          managerUser
          ? `${managerUser.first_name ?? ""} ${managerUser.last_name ?? ""}`.trim()
          : null,
        investorAdvisorName:  invAdvisorUser
          ? `${invAdvisorUser.first_name ?? ""} ${invAdvisorUser.last_name ?? ""}`.trim()
          : null,
        isInForeclosure:      (financial as any)?.is_in_foreclosure ?? false,
        stageId:              String(lead.stage_id),
        revenue:              lead.s2r_net_revenue ? parseFloat(lead.s2r_net_revenue) : null,
        lastUpdated:          lead.last_updated ? new Date(lead.last_updated).toISOString() : null,
        isHot:                lead.is_hot ?? false,
        lead_number:          lead.lead_number,
        seller_name:          leadName,
        property_address:     (property as any)?.address ?? null,
        stage_name:           (stage as any)?.name ?? null,
        days_in_stage:        lead.days_in_current_stage ?? 0,
        action_required:      null,
        propertyId:           lead.property_id,
        phase:                lead.pipeline_type,
        desired_timeline:     (seller as any)?.desired_timeline ?? null,
        days_on_market:       lead.property_id
          ? (realtorInfoMap.get(lead.property_id) as any)?.days_on_market ?? 0
          : 0,
        s2r_net_revenue:      lead.s2r_net_revenue ? parseFloat(lead.s2r_net_revenue) : 0,
        result:               lead.result ?? null,
        offer_date:           (deal as any)?.offer_presented_date
          ? new Date((deal as any).offer_presented_date).toISOString()
          : null,
        marketing_source:     lead.marketing_source ?? null,
        leadNotes:            lead.lead_notes ?? null,
      };
    });

    // 8. Search filter (applied in-memory so it can match across assembled fields)
    const searchTerm = filters.search ?? filters.searchQuery;
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      mappedLeads = mappedLeads.filter(
        (l) =>
          l.leadName.toLowerCase().includes(query) ||
          l.state?.toLowerCase().includes(query)
      );
    }

    return { leads: mappedLeads, totalCount, stageCounts };
  }
}
