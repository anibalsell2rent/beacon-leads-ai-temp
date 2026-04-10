import { hasuraQuery } from "../utils/hasura.client";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface LeadRow {
  id: string;
  lead_number: string | null;
  stage_id: string | null;
  property_id: string | null;
  seller_advisor_id: string | null;
  seller_manager_id: string | null;
  is_hot: boolean | null;
  s2r_net_revenue: string | null;
  result: string | null;
  lead_score: number | null;
  lead_final_score: number | null;
  seller_segment: string | null;
  marketing_source: string | null;
  lead_notes: string | null;
  days_in_current_stage: number | null;
  pipeline_type: string | null;
  scheduled_booking_date: string | null;
  follow_up_date: string | null;
  scheduled_meeting_date: string | null;
}

export class IndividualDashboardService {
  static async getIndividualDashboard(employeeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();
    const todayEndDate = new Date();
    todayEndDate.setHours(23, 59, 59, 999);
    const todayEnd = todayEndDate.toISOString();

    const monthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    ).toISOString();

    // 1. Resolve user identity — supports UUID, zoho_user_id (numeric/large), or email
    const isEmail = employeeId.includes("@");
    const isUuid  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeId);
    const isNumeric = /^\d+$/.test(employeeId);

    let userWhere: any;
    if (isEmail) {
      userWhere = { email: { _eq: employeeId } };
    } else if (isUuid) {
      userWhere = { id: { _eq: employeeId } };
    } else if (isNumeric) {
      // When numeric, try to match users.id (which is Int)
      userWhere = { id: { _eq: parseInt(employeeId) } };
    } else {
      userWhere = { email: { _eq: employeeId } };
    }

    const identityData = await hasuraQuery<{
      users: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        zoho_user_id: string | null;
        email: string | null;
      }[];
    }>(
      `
      query ResolveUser($where: users_bool_exp!) {
        users(where: $where, limit: 1) {
          id first_name last_name zoho_user_id email
        }
      }
    `,
      { where: userWhere }
    );

    const user = identityData.users[0];
    if (!user) {
      return {
        summary: this.getEmptySummary(),
        hotLeads: [],
        dailyOrganizer: [],
        pipelineLeads: [],
      };
    }

    const userIntId    = user.id;
    const numericUserId = user.zoho_user_id;
    


    // 2. Fetch all leads + related data in one batch
  
    const batchData = await hasuraQuery<{
      hotLeads:   LeadRow[];
      dailyLeads: LeadRow[];
      allLeads:   LeadRow[];
      monthConverted: { aggregate: { count: number } };
      callsCount: { aggregate: { count: number } };
      smsCount:   { aggregate: { count: number } };
      todayBookings: { aggregate: { count: number } };
    }>(
      `
      query IndividualDashboard(
        $advisorId: Int!
        $createdById: Int
        $todayStart: timestamptz!
        $todayEnd: timestamptz!
        $todayStartTs: timestamp!
        $todayEndTs: timestamp!
        $monthStart: timestamptz!
      ) {
        hotLeads: crm_leads(
          where: {
            is_hot: { _eq: true }
            _or: [
              { owner_id: { _eq: $advisorId } }
              { seller_manager_id: { _eq: $advisorId } }
            ]
          }
          limit: 50
        ) {
          id lead_number stage_id property_id seller_advisor_id seller_manager_id
          is_hot s2r_net_revenue result lead_score lead_final_score
          seller_segment marketing_source lead_notes days_in_current_stage
          pipeline_type scheduled_booking_date follow_up_date scheduled_meeting_date
        }

        dailyLeads: crm_leads(
          where: {
            _or: [
              { owner_id: { _eq: $advisorId } }
              { seller_manager_id: { _eq: $advisorId } }
            ]
            _and: [
              {
                _or: [
                  { scheduled_booking_date: { _gte: $todayStart, _lte: $todayEnd } }
                  { follow_up_date:         { _gte: $todayStart, _lte: $todayEnd } }
                  { scheduled_meeting_date: { _gte: $todayStart, _lte: $todayEnd } }
                ]
              }
            ]
          }
        ) {
          id lead_number stage_id property_id seller_advisor_id seller_manager_id
          is_hot s2r_net_revenue result lead_score lead_final_score
          seller_segment marketing_source lead_notes days_in_current_stage
          pipeline_type scheduled_booking_date follow_up_date scheduled_meeting_date
        }

        allLeads: crm_leads(
          where: {
            _or: [
              { owner_id: { _eq: $advisorId } }
              { seller_manager_id: { _eq: $advisorId } }
            ]
          }
          limit: 100
        ) {
          id lead_number stage_id property_id seller_advisor_id seller_manager_id
          is_hot s2r_net_revenue result lead_score lead_final_score
          seller_segment marketing_source lead_notes days_in_current_stage
          pipeline_type scheduled_booking_date follow_up_date scheduled_meeting_date
        }

        monthConverted: crm_deals_aggregate(
          where: {
            created_at: { _gte: $monthStart }
          }
        ) { aggregate { count } }

        todayBookings: crm_leads_aggregate(
          where: {
            _or: [
              { owner_id: { _eq: $advisorId } }
              { seller_manager_id: { _eq: $advisorId } }
            ]
            scheduled_meeting_date: { _gte: $todayStart, _lte: $todayEnd }
            result: { _ilike: "%Contacted%" }
          }
        ) { aggregate { count } }

        callsCount: crm_activities_aggregate(
          where: {
            created_by: { _eq: $createdById }
            activity_type_id: { _eq: 1 }
            created_at: { _gte: $todayStartTs, _lte: $todayEndTs }
          }
        ) { aggregate { count } }

        smsCount: crm_activities_aggregate(
          where: {
            created_by: { _eq: $createdById }
            activity_type_id: { _eq: 2 }
            created_at: { _gte: $todayStartTs, _lte: $todayEndTs }
          }
        ) { aggregate { count } }
      }
    `,
      {
        advisorId: userIntId,
        createdById: userIntId,
        todayStart,
        todayEnd,
        todayStartTs: todayStart,
        todayEndTs:   todayEnd,
        monthStart,
      }
    );

    // 3. Format leads
    console.log(`[IndividualDashboard] Leads retrieved for userIntId "${userIntId}":`, {
      hotLeads: batchData.hotLeads.length,
      dailyLeads: batchData.dailyLeads.length,
      allLeads: batchData.allLeads.length,
    });

    // 3. Format leads
    const [formattedHot, formattedDaily, formattedPipeline] = await Promise.all([
      this.formatLeads(batchData.hotLeads),
      this.formatLeads(batchData.dailyLeads),
      this.formatLeads(batchData.allLeads),
    ]);

    const todayBookings   = batchData.todayBookings.aggregate.count;
    const monthConverted  = batchData.monthConverted.aggregate.count;
    const connectedCalls  = batchData.callsCount.aggregate.count;
    const smsSent         = batchData.smsCount.aggregate.count;

    const summary = {
      connectedCalls,
      smsSent,
      bookingsCompleted: {
        current:    todayBookings,
        goal:       20,
        percentage: (todayBookings / 20) * 100,
        delta:      todayBookings - 20,
      },
      leadsConverted: {
        current:    monthConverted,
        goal:       5,
        percentage: (monthConverted / 5) * 100,
        delta:      monthConverted - 5,
      },
    };

    return {
      summary,
      hotLeads:      formattedHot,
      dailyOrganizer: formattedDaily,
      pipelineLeads: formattedPipeline,
    };
  }

  private static getEmptySummary() {
    return {
      connectedCalls: 0,
      smsSent: 0,
      bookingsCompleted: { current: 0, goal: 0, percentage: 0, delta: 0 },
      leadsConverted:    { current: 0, goal: 0, percentage: 0, delta: 0 },
    };
  }

  private static async formatLeads(leads: LeadRow[]) {
    if (leads.length === 0) return [];

    const leadIds     = leads.map((l) => l.id);
    const propertyIds = [...new Set(leads.map((l) => l.property_id).filter(Boolean))] as string[];

    const data = await hasuraQuery<{
      crm_sellers: {
        lead_id: string;
        first_name: string | null;
        last_name: string | null;
        mailing_state: string | null;
      }[];
      crm_property_financials: {
        property_id: string;
        is_in_foreclosure: boolean | null;
      }[];
      crm_stages: { id: string; name: string }[];
      properties: {
        id: string;
        address: string | null;
        city: string | null;
        state: string | null;
        seller_name: string | null;
        campaign_source: string | null;
      }[];
      crm_deals: {
        lead_id: string;
        offer_presented_date: string | null;
      }[];
      properties_lead_scoring: {
        property_id: string;
        section: string;
        seller_score: string | null;
        property_score: string | null;
        transaction_score: string | null;
        investor_score: string | null;
        s2r_fee: string | null;
      }[];
    }>(
      `
      query FormatLeads($leadIds: [uuid!]!, $propertyIds: [String!]!) {
        crm_sellers(where: { lead_id: { _in: $leadIds } }) {
          lead_id first_name last_name mailing_state
        }
        crm_property_financials(where: { property_id: { _in: $propertyIds } }) {
          property_id is_in_foreclosure
        }
        crm_stages { id name }
        properties(where: { id: { _in: $propertyIds } }) {
          id address city state seller_name campaign_source
        }
        crm_deals(where: { lead_id: { _in: $leadIds } }) {
          lead_id offer_presented_date
        }
        properties_lead_scoring(where: { property_id: { _in: $propertyIds } }) {
          property_id section
          seller_score property_score transaction_score investor_score s2r_fee
        }
      }
    `,
      { leadIds, propertyIds }
    );

    // Build score map
    const scoringMap = new Map<string, Record<string, number>>();
    for (const row of data.properties_lead_scoring) {
      const total = [
        row.seller_score,
        row.property_score,
        row.transaction_score,
        row.investor_score,
        row.s2r_fee,
      ].reduce((sum, v) => sum + (parseFloat(v ?? "0") || 0), 0);

      if (!scoringMap.has(row.property_id)) scoringMap.set(row.property_id, {});
      scoringMap.get(row.property_id)![row.section] = Math.round(total);
    }

    const stagesMap     = new Map(data.crm_stages.map((s) => [s.id, s]));
    const propertiesMap = new Map(data.properties.map((p) => [p.id, p]));
    const dealsMap      = new Map(data.crm_deals.map((d) => [d.lead_id, d]));
    const sellersMap    = new Map(data.crm_sellers.map((s) => [s.lead_id, s]));

    return leads.map((lead) => {
      const stage    = lead.stage_id ? stagesMap.get(lead.stage_id) : null;
      const seller   = sellersMap.get(lead.id);
      const property = lead.property_id ? propertiesMap.get(lead.property_id) : null;
      const deal     = dealsMap.get(lead.id);

      let leadName = "Unknown Seller";
      if (property?.seller_name) {
        leadName = property.seller_name;
      } else if (seller && (seller.first_name || seller.last_name)) {
        leadName = `${seller.first_name ?? ""} ${seller.last_name ?? ""}`.trim();
      }

      const scoreData = lead.property_id ? scoringMap.get(lead.property_id) : null;
      const lead_score = scoreData
        ? Math.round(scoreData.final || scoreData.initial || 0)
        : Math.round(lead.lead_score || lead.lead_final_score || 0);

      return {
        id:               lead.id,
        lead_number:      lead.lead_number,
        seller_name:      leadName,
        state:            property?.state ?? (seller as any)?.mailing_state ?? null,
        property_address: property?.address ?? null,
        s2r_net_revenue:  lead.s2r_net_revenue ? parseFloat(lead.s2r_net_revenue) : 0,
        result:           lead.result ?? null,
        offer_date:       deal?.offer_presented_date
          ? new Date(deal.offer_presented_date).toISOString()
          : null,
        lead_score,
        score:            lead_score,
        seller_segment:   lead.seller_segment ?? null,
        marketing_source: lead.marketing_source ?? property?.campaign_source ?? null,
        stage_name:       (stage as any)?.name ?? null,
        leadNotes:        lead.lead_notes ?? null,
        days_in_stage:    lead.days_in_current_stage ?? 0,
        propertyId:       lead.property_id,
        phase:            lead.pipeline_type ?? null,
        action_required:  null,
      };
    });
  }
}
