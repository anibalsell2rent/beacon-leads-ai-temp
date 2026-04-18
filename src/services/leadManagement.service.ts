import { hasuraQuery } from "../utils/hasura.client";
import { Timeframe } from "./teamPerformance.service";
import {
  getDateRange,
  fetchZohoPerformanceGoals,
  filterGoalsByDateRange,
  buildGoalsByEmail,
  createMetric,
  fetchManagerActualsFromZoho,
} from "../utils/zoho-goals.utils";

// ─── Stage ID to Slug Map ──────────────────────────────────────────────────────

const STAGE_SLUG_MAP: Record<string, string> = {
  "6c4f7ca5-b767-4c7d-850f-27e2637efcc0": "analyze-qualify",
  "ad6b4c54-e864-4ba5-88ca-5bea3c8fe4fa": "attempted-to-contact",
  "2870c18a-3d3c-4298-add2-8ccfcf9ba6be": "disqualified",
  "10831869-6cdb-4978-8377-cddb0860ac87": "encouragement",
  "4b272beb-780b-4d1e-b646-403c86a5e3dd": "initial-booking",
  "3b3d5f25-7a8a-41b6-a4ec-3ec3f5af6fbe": "title-remediation",
  "be4b516c-b19f-421d-8d0a-4c30b6356f07": "new-lead",
  "7de2f1b1-5d75-448f-9d93-60ccc6832cc3": "propose-to-seller",
  "358e43dd-9d99-4972-951c-10f4e1a2ee6f": "psa-execution",
  "397dae47-6fc9-4770-a5af-994f9d851f69": "referral",
  "4e9a40d3-e270-4dba-ad79-fc6235f5c826": "revisit-later",
  "332c2389-a797-46c0-90d6-1d8df31521db": "sales-icu",
  "20c18604-1bef-4ff1-91df-5472b5b7011b": "underwriting",
  "9b82698f-85ed-48f6-bd5c-580e7d967f3a": "unsubscribed",
};

// ─── Types ─────────────────────────────────────────────────────────────────────

type LeadTab = "HOT_LEAD" | "LIVE_OFFER" | "PIPELINE_FOLLOW_UP" | "NEW_LEAD";
type LeadTeamRating = "AMAZING" | "GOOD" | "NEUTRAL" | "BAD";

interface User {
  id: number;
  slug: string;
  name: string;
  email: string;
  initials: string;
  role: string;
}

interface LeadNote {
  id: number;
  content: string;
  timestamp: string;
  createdBy: number;
  createdByName: string;
}

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  leadTeamRating: LeadTeamRating | null;
  stageId: string | null;
  stageName: string | null;
  assignedTo: number | null;
  assignedToName: string | null;
  leadScore: number | null;
  s2rNetRevenue: number | null;
  sellerSegment: string | null;
  marketingSource: string | null;
  dateCreated: string | null;
  updatedAt: string | null;
  tabs: LeadTab[];
  notes: LeadNote[];
}

interface ManagerLeadsResponse {
  hotLeads: Lead[];
  liveOffers: Lead[];
  pipelineFollowUps: Lead[];
  newLeads: Lead[];
  trackingDate: string;
}

interface GoalMetric {
  actual: number;
  target: number;
  percentage: number;
  conversionRate?: number;
}

interface ManagerGoals {
  userId: number;
  email: string;
  name: string;
  slug: string;
  initials: string;
  goalId: string | null;
  goalName: string | null;
  startingDate: string | null;
  endDate: string | null;
  firstCallSmsAttempts: GoalMetric;
  newSellersContacted: GoalMetric;
  followUpsAttempted: GoalMetric;
  followUpsConnected: GoalMetric;
  offersPresented: GoalMetric;
  offersAccepted: GoalMetric;
  psasExecuted: GoalMetric;
  leadsConverted: GoalMetric;
}

// ─── Queries ───────────────────────────────────────────────────────────────────

const USER_BY_SLUG_QUERY = `
  query GetUserBySlug($slug: String!) {
    users(where: { slug: { _eq: $slug } }, limit: 1) {
      id slug email first_name last_name initials role
    }
  }
`;

const MANAGER_LEADS_QUERY = `
  query GetManagerLeads($managerId: Int!, $trackingDate: date!) {
    hotLeads: manager_lead_tracking(
      where: { manager_id: { _eq: $managerId }, tab: { _eq: "HOT_LEAD" }, is_active: { _eq: true } }
      order_by: { added_at: desc }
    ) {
      id lead_id tab added_at tracking_date is_active
      crm_lead {
        id zoho_lead_id lead_team_rating stage_id date_created updated_at
        lead_final_score s2r_net_revenue seller_segment marketing_source
        seller_manager_id is_hot
        seller_manager { id first_name last_name }
        crm_seller { first_name last_name email phone }
        property { address city state zip_code }
      }
    }
    liveOffers: manager_lead_tracking(
      where: { manager_id: { _eq: $managerId }, tab: { _eq: "LIVE_OFFER" }, is_active: { _eq: true } }
      order_by: { added_at: desc }
    ) {
      id lead_id tab added_at tracking_date is_active
      crm_lead {
        id zoho_lead_id lead_team_rating stage_id date_created updated_at
        lead_final_score s2r_net_revenue seller_segment marketing_source
        seller_manager_id is_hot
        seller_manager { id first_name last_name }
        crm_seller { first_name last_name email phone }
        property { address city state zip_code }
      }
    }
    pipelineFollowUps: manager_lead_tracking(
      where: { manager_id: { _eq: $managerId }, tab: { _eq: "PIPELINE_FOLLOW_UP" }, tracking_date: { _eq: $trackingDate } }
      order_by: { added_at: desc }
    ) {
      id lead_id tab added_at tracking_date is_active
      crm_lead {
        id zoho_lead_id lead_team_rating stage_id date_created updated_at
        lead_final_score s2r_net_revenue seller_segment marketing_source
        seller_manager_id is_hot
        seller_manager { id first_name last_name }
        crm_seller { first_name last_name email phone }
        property { address city state zip_code }
      }
    }
    newLeads: manager_lead_tracking(
      where: { manager_id: { _eq: $managerId }, tab: { _eq: "NEW_LEAD" }, tracking_date: { _eq: $trackingDate } }
      order_by: { added_at: desc }
    ) {
      id lead_id tab added_at tracking_date is_active
      crm_lead {
        id zoho_lead_id lead_team_rating stage_id date_created updated_at
        lead_final_score s2r_net_revenue seller_segment marketing_source
        seller_manager_id is_hot
        seller_manager { id first_name last_name }
        crm_seller { first_name last_name email phone }
        property { address city state zip_code }
      }
    }
  }
`;

const LEAD_NOTES_QUERY = `
  query GetLeadNotes($zohoLeadIds: [String!]!, $trackingDate: date!) {
    crm_activities(
      where: { lead_id: { _in: $zohoLeadIds }, activity_type_id: { _eq: 4 }, tracking_date: { _eq: $trackingDate } }
      order_by: { created_at: desc }
    ) {
      id lead_id notes created_at created_by
      user { first_name last_name }
    }
  }
`;

const LEAD_TABS_QUERY = `
  query GetLeadTabs($leadIds: [uuid!]!, $managerId: Int!, $trackingDate: date!) {
    manager_lead_tracking(
      where: { lead_id: { _in: $leadIds }, manager_id: { _eq: $managerId }, tracking_date: { _eq: $trackingDate } }
    ) {
      lead_id tab
    }
  }
`;

const PRIORITY_PANEL_HISTORY_QUERY = `
  query GetPriorityPanelHistory($managerId: Int!, $tab: String!, $trackingDate: date!) {
    manager_lead_tracking(
      where: { 
        manager_id: { _eq: $managerId }, 
        tab: { _eq: $tab }, 
        tracking_date: { _eq: $trackingDate } 
      }
      order_by: { added_at: desc }
    ) {
      id lead_id tab added_at tracking_date is_active
      crm_lead {
        id zoho_lead_id lead_team_rating stage_id date_created updated_at
        lead_final_score s2r_net_revenue seller_segment marketing_source
        seller_manager_id is_hot
        seller_manager { id first_name last_name }
        crm_seller { first_name last_name email phone }
        property { address city state zip_code }
      }
    }
  }
`;

const SEARCH_LEADS_QUERY = `
  query SearchLeads($query: String!, $limit: Int!) {
    crm_leads(
      where: {
        crm_seller: {
          _or: [
            { first_name: { _ilike: $query } }
            { last_name: { _ilike: $query } }
            { email: { _ilike: $query } }
            { phone: { _ilike: $query } }
          ]
        }
      }
      limit: $limit
      order_by: { date_created: desc }
    ) {
      id lead_team_rating stage_id date_created updated_at
      seller_manager_id is_hot
      crm_seller {
        first_name last_name email phone address city state zip_code
      }
    }
  }
`;

const SEARCH_SELLERS_FOR_TAB_QUERY = `
  query SearchSellersForTab($query: String!, $firstName: String!, $lastName: String!, $limit: Int!, $excludeLeadIds: [uuid!]!, $managerId: Int!) {
    crm_leads(
      where: {
        id: { _nin: $excludeLeadIds }
        seller_manager_id: { _eq: $managerId }
        _or: [
          { crm_seller: { first_name: { _ilike: $query } } }
          { crm_seller: { last_name: { _ilike: $query } } }
          { crm_seller: { email: { _ilike: $query } } }
          { crm_seller: { phone: { _ilike: $query } } }
          { crm_seller: { _and: [{ first_name: { _ilike: $firstName } }, { last_name: { _ilike: $lastName } }] } }
        ]
      }
      limit: $limit
      order_by: { date_created: desc }
    ) {
      id zoho_lead_id lead_team_rating stage_id date_created updated_at
      lead_final_score s2r_net_revenue seller_segment marketing_source
      seller_manager_id is_hot
      seller_manager { id first_name last_name }
      crm_seller { first_name last_name email phone }
      property { address city state zip_code }
    }
  }
`;

const LEADS_IN_TAB_QUERY = `
  query GetLeadsInTab($managerId: Int!, $tab: String!, $trackingDate: date!) {
    manager_lead_tracking(
      where: { manager_id: { _eq: $managerId }, tab: { _eq: $tab }, tracking_date: { _eq: $trackingDate } }
    ) {
      lead_id
    }
  }
`;

const GET_LEADS_BY_STAGE_QUERY = `
  query GetLeadsByStage($stageId: uuid!, $limit: Int!, $offset: Int!) {
    crm_leads(
      where: { stage_id: { _eq: $stageId } }
      limit: $limit
      offset: $offset
      order_by: { date_created: desc }
    ) {
      id zoho_lead_id lead_team_rating stage_id date_created updated_at
      lead_final_score s2r_net_revenue seller_segment marketing_source
      seller_manager_id is_hot
      seller_manager { id first_name last_name }
      crm_seller { first_name last_name email phone }
      property { address city state zip_code }
    }
  }
`;

const GET_LEADS_BY_MANAGER_AND_STAGE_QUERY = `
  query GetLeadsByManagerAndStage($managerId: Int!, $stageId: uuid!, $limit: Int!, $offset: Int!) {
    crm_leads(
      where: { seller_manager_id: { _eq: $managerId }, stage_id: { _eq: $stageId } }
      limit: $limit
      offset: $offset
      order_by: { date_created: desc }
    ) {
      id zoho_lead_id lead_team_rating stage_id date_created updated_at
      lead_final_score s2r_net_revenue seller_segment marketing_source
      seller_manager_id is_hot
      seller_manager { id first_name last_name }
      crm_seller { first_name last_name email phone }
      property { address city state zip_code }
    }
  }
`;

const LEAD_BY_ID_QUERY = `
  query GetLeadById($leadId: uuid!) {
    crm_leads_by_pk(id: $leadId) {
      id zoho_lead_id lead_team_rating stage_id date_created updated_at
      lead_final_score s2r_net_revenue seller_segment marketing_source
      seller_manager_id is_hot
      seller_manager { id first_name last_name }
      crm_seller { first_name last_name email phone }
      property { address city state zip_code }
    }
    manager_lead_tracking(where: { lead_id: { _eq: $leadId } }) {
      tab
    }
  }
`;

const LEAD_ACTIVITIES_BY_ZOHO_ID_QUERY = `
  query GetLeadActivities($zohoLeadId: String!) {
    crm_activities(
      where: { lead_id: { _eq: $zohoLeadId }, activity_type_id: { _eq: 4 } }
      order_by: { created_at: desc }
    ) {
      id notes created_at created_by
      user { first_name last_name }
    }
  }
`;

const MANAGER_INFO_QUERY = `
  query GetManagerInfo($managerId: Int!) {
    users_by_pk(id: $managerId) {
      id email first_name last_name initials slug
    }
  }
`;

const ADD_LEAD_TO_TAB_MUTATION = `
  mutation AddLeadToTab($managerId: Int!, $leadId: uuid!, $tab: String!, $trackingDate: date!) {
    insert_manager_lead_tracking_one(
      object: { manager_id: $managerId, lead_id: $leadId, tab: $tab, tracking_date: $trackingDate }
      on_conflict: { constraint: manager_lead_tracking_unique_per_day, update_columns: [] }
    ) {
      id
    }
  }
`;

const REMOVE_LEAD_FROM_TAB_MUTATION = `
  mutation RemoveLeadFromTab($managerId: Int!, $leadId: uuid!, $tab: String!, $trackingDate: date!) {
    delete_manager_lead_tracking(
      where: {
        manager_id: { _eq: $managerId }
        lead_id: { _eq: $leadId }
        tab: { _eq: $tab }
        tracking_date: { _eq: $trackingDate }
      }
    ) {
      affected_rows
    }
  }
`;

const DEACTIVATE_LEAD_FROM_TAB_MUTATION = `
  mutation DeactivateLeadFromTab($managerId: Int!, $leadId: uuid!, $tab: String!) {
    update_manager_lead_tracking(
      where: {
        manager_id: { _eq: $managerId }
        lead_id: { _eq: $leadId }
        tab: { _eq: $tab }
        is_active: { _eq: true }
      }
      _set: { is_active: false }
    ) {
      affected_rows
    }
  }
`;

const UPDATE_LEAD_RATING_MUTATION = `
  mutation UpdateLeadRating($leadId: uuid!, $rating: String) {
    update_crm_leads_by_pk(
      pk_columns: { id: $leadId }
      _set: { lead_team_rating: $rating }
    ) {
      id lead_team_rating
    }
  }
`;

const UPDATE_LEAD_IS_HOT_MUTATION = `
  mutation UpdateLeadIsHot($leadId: uuid!, $isHot: Boolean!) {
    update_crm_leads_by_pk(
      pk_columns: { id: $leadId }
      _set: { is_hot: $isHot }
    ) {
      id is_hot
    }
  }
`;

const ADD_LEAD_NOTE_MUTATION = `
  mutation AddLeadNote($zohoLeadId: String!, $notes: jsonb!, $createdBy: Int!, $trackingDate: date!) {
    insert_crm_activities_one(
      object: {
        lead_id: $zohoLeadId
        activity_type_id: 4
        notes: $notes
        created_by: $createdBy
        seller_id: $createdBy
        tracking_date: $trackingDate
      }
    ) {
      id notes created_at created_by tracking_date
      user { first_name last_name }
    }
  }
`;

const UPDATE_TRACKING_NOTE_MUTATION = `
  mutation UpdateTrackingNote($noteId: Int!, $notes: jsonb!) {
    update_crm_activities_by_pk(
      pk_columns: { id: $noteId }
      _set: { notes: $notes }
    ) {
      id notes created_at created_by
      user { first_name last_name }
    }
  }
`;

const DELETE_TRACKING_NOTE_MUTATION = `
  mutation DeleteTrackingNote($noteId: Int!) {
    delete_crm_activities_by_pk(id: $noteId) {
      id
    }
  }
`;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function mapLead(data: any, tabs: LeadTab[] = [], notes: LeadNote[] = []): Lead {
  const lead = data.crm_lead || data;
  const seller = lead.crm_seller;
  const manager = lead.seller_manager;
  const property = lead.property;

  const fullName = seller
    ? `${seller.first_name ?? ""} ${seller.last_name ?? ""}`.trim()
    : "";
  const assignedToName = manager
    ? `${manager.first_name ?? ""} ${manager.last_name ?? ""}`.trim()
    : null;

  return {
    id: lead.id,
    name: fullName,
    email: seller?.email ?? null,
    phone: seller?.phone ?? null,
    address: property?.address ?? null,
    city: property?.city ?? null,
    state: property?.state ?? null,
    zipCode: property?.zip_code ?? null,
leadTeamRating: lead.lead_team_rating?.toUpperCase() as LeadTeamRating | null,
  stageId: lead.stage_id,
  stageName: lead.stage_id ? STAGE_SLUG_MAP[lead.stage_id] ?? null : null,
    assignedTo: lead.seller_manager_id,
    assignedToName,
    leadScore: lead.lead_final_score,
    s2rNetRevenue: lead.s2r_net_revenue,
    sellerSegment: lead.seller_segment,
    marketingSource: lead.marketing_source,
    dateCreated: lead.date_created,
    updatedAt: lead.updated_at,
    isHot: lead.is_hot ?? false,
    tabs,
    notes,
  };
}

function parseNote(activity: any): LeadNote {
  let content = "";
  let timestamp = activity.created_at;

  try {
    const notesData = typeof activity.notes === "string"
      ? JSON.parse(activity.notes)
      : activity.notes;
    content = notesData?.content ?? "";
    timestamp = notesData?.timestamp ?? activity.created_at;
  } catch {
    content = typeof activity.notes === "string" ? activity.notes : "";
  }

  const user = activity.user;
  const createdByName = user
    ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
    : "Unknown";

  return {
    id: activity.id,
    content,
    timestamp,
    createdBy: activity.created_by,
    createdByName,
  };
}

// ─── Service ───────────────────────────────────────────────────────────────────

export class LeadManagementService {
  static async getUserBySlug(slug: string): Promise<User | null> {
    const data = await hasuraQuery<any>(USER_BY_SLUG_QUERY, { slug });
    const user = data.users?.[0];
    if (!user) return null;

    const firstName = user.first_name ?? "";
    const lastName = user.last_name ?? "";
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

    return {
      id: user.id,
      slug: user.slug ?? "",
      name: `${firstName} ${lastName}`.trim(),
      email: user.email ?? "",
      initials,
      role: user.role ?? "",
    };
  }

  static async getManagerGoalsByUserId(
    userId: number,
    timeframe: Timeframe
  ): Promise<ManagerGoals | null> {
    const managerData = await hasuraQuery<any>(MANAGER_INFO_QUERY, { managerId: userId });
    const manager = managerData.users_by_pk;
    if (!manager) return null;

    const range = getDateRange(timeframe);
    const [zohoGoals, actuals] = await Promise.all([
      fetchZohoPerformanceGoals(),
      fetchManagerActualsFromZoho(manager.email, range),
    ]);

    const filteredGoals = filterGoalsByDateRange(zohoGoals, range);
    const goalsByEmail = buildGoalsByEmail(filteredGoals);
    const goal = goalsByEmail.get(manager.email?.toLowerCase());

    const firstName = manager.first_name ?? "";
    const lastName = manager.last_name ?? "";
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

    return {
      userId: manager.id,
      email: manager.email ?? "",
      name: `${firstName} ${lastName}`.trim(),
      slug: manager.slug ?? "",
      initials,
      goalId: goal?.id ?? null,
      goalName: goal?.Name ?? null,
      startingDate: goal?.Starting_Date ?? null,
      endDate: goal?.End_Date ?? null,
      firstCallSmsAttempts: createMetric(0, 0),
      newSellersContacted: createMetric(0, 0),
      followUpsAttempted: createMetric(0, 0),
      followUpsConnected: createMetric(0, 0),
      offersPresented: createMetric(actuals.offersPresented, goal?.Offers_Presented_Target ?? null),
      offersAccepted: createMetric(actuals.offersAccepted, goal?.Offers_Accepted_Target ?? null),
      psasExecuted: createMetric(actuals.psasExecuted, goal?.PSA_s_Executed_Target ?? null),
      leadsConverted: createMetric(actuals.convertedLeads, goal?.Converted_Leads_Target ?? null),
    };
  }

  static async getManagerLeads(managerId: number, trackingDate?: string): Promise<ManagerLeadsResponse> {
    const dateToUse = trackingDate ?? new Date().toISOString().split("T")[0];
    const data = await hasuraQuery<any>(MANAGER_LEADS_QUERY, { managerId, trackingDate: dateToUse });

    const allItems = [
      ...(data.hotLeads ?? []),
      ...(data.liveOffers ?? []),
      ...(data.pipelineFollowUps ?? []),
      ...(data.newLeads ?? []),
    ];

    // Get unique lead IDs (uuid) for tabs query
    const uniqueLeadIds = [...new Set(allItems.map((item: any) => item.crm_lead?.id).filter(Boolean))];

    // Get unique zoho_lead_ids (text) for notes query
    const uniqueZohoLeadIds = [...new Set(allItems.map((item: any) => item.crm_lead?.zoho_lead_id).filter(Boolean))];

    // Create mapping from zoho_lead_id to lead id
    const zohoToLeadIdMap = new Map<string, string>();
    for (const item of allItems) {
      if (item.crm_lead?.zoho_lead_id && item.crm_lead?.id) {
        zohoToLeadIdMap.set(item.crm_lead.zoho_lead_id, item.crm_lead.id);
      }
    }

    // Fetch notes (using zoho_lead_ids + trackingDate) and tabs (using lead ids) in parallel
    const [notesData, tabsData] = await Promise.all([
      uniqueZohoLeadIds.length > 0
        ? hasuraQuery<any>(LEAD_NOTES_QUERY, { zohoLeadIds: uniqueZohoLeadIds, trackingDate: dateToUse })
        : { crm_activities: [] },
      uniqueLeadIds.length > 0
        ? hasuraQuery<any>(LEAD_TABS_QUERY, { leadIds: uniqueLeadIds, managerId, trackingDate: dateToUse })
        : { manager_lead_tracking: [] },
    ]);

    // Group notes by lead_id (uuid) - convert from zoho_lead_id
    const notesByLead = new Map<string, LeadNote[]>();
    for (const activity of notesData.crm_activities ?? []) {
      const leadId = zohoToLeadIdMap.get(activity.lead_id);
      if (leadId) {
        if (!notesByLead.has(leadId)) notesByLead.set(leadId, []);
        notesByLead.get(leadId)!.push(parseNote(activity));
      }
    }

    // Group tabs by lead_id (uuid)
    const tabsByLead = new Map<string, LeadTab[]>();
    for (const tracking of tabsData.manager_lead_tracking ?? []) {
      const leadId = tracking.lead_id;
      if (!tabsByLead.has(leadId)) tabsByLead.set(leadId, []);
      tabsByLead.get(leadId)!.push(tracking.tab as LeadTab);
    }

    const mapLeads = (items: any[]) =>
      items.map((item) => {
        const leadId = item.crm_lead?.id;
        return mapLead(item, tabsByLead.get(leadId) ?? [], notesByLead.get(leadId) ?? []);
      });

    return {
      hotLeads: mapLeads(data.hotLeads ?? []),
      liveOffers: mapLeads(data.liveOffers ?? []),
      pipelineFollowUps: mapLeads(data.pipelineFollowUps ?? []),
      newLeads: mapLeads(data.newLeads ?? []),
      trackingDate: dateToUse,
    };
  }

  static async searchLeads(query: string, limit = 20): Promise<Lead[]> {
    const searchPattern = `%${query}%`;
    const data = await hasuraQuery<any>(SEARCH_LEADS_QUERY, {
      query: searchPattern,
      limit,
    });

    return (data.crm_leads ?? []).map((lead: any) => mapLead(lead));
  }

static async searchSellersForTab(
    query: string,
    tab: LeadTab,
    managerId: number,
    trackingDate?: string,
    limit = 20
  ): Promise<Lead[]> {
    const dateToUse = trackingDate ?? new Date().toISOString().split("T")[0];
    const searchPattern = `%${query}%`;

    // Parse query for full name search (e.g., "John Doe" -> firstName: "John", lastName: "Doe")
    const parts = query.trim().split(/\s+/);
    const firstName = parts.length > 1 ? `%${parts[0]}%` : `%${query}%`;
    const lastName = parts.length > 1 ? `%${parts.slice(1).join(" ")}%` : `%${query}%`;

    // Get leads already in this tab for this manager/date
    const existingData = await hasuraQuery<any>(LEADS_IN_TAB_QUERY, {
      managerId,
      tab,
      trackingDate: dateToUse,
    });
    const excludeLeadIds = (existingData.manager_lead_tracking ?? []).map((t: any) => t.lead_id);

    // Search for leads excluding those already in the tab, filtered by seller_manager_id
    const data = await hasuraQuery<any>(SEARCH_SELLERS_FOR_TAB_QUERY, {
      query: searchPattern,
      firstName,
      lastName,
      limit,
      managerId,
      excludeLeadIds: excludeLeadIds.length > 0 ? excludeLeadIds : ["00000000-0000-0000-0000-000000000000"],
    });

    return (data.crm_leads ?? []).map((lead: any) => mapLead(lead));
  }

  static async getPriorityPanelHistory(
    managerId: number,
    tab: LeadTab,
    trackingDate: string
  ): Promise<Lead[]> {
    const data = await hasuraQuery<any>(PRIORITY_PANEL_HISTORY_QUERY, {
      managerId,
      tab,
      trackingDate,
    });

    const trackingRecords = data.manager_lead_tracking ?? [];
    return trackingRecords
      .filter((record: any) => record.crm_lead)
      .map((record: any) => mapLead(record.crm_lead, [record.tab]));
  }

  static async getLeads(managerId?: number, stageId?: string, limitPerStage = 50, offsetPerStage = 0): Promise<Lead[]> {
    const stageIds = stageId ? [stageId] : Object.keys(STAGE_SLUG_MAP);

    // Fetch leads for each stage in parallel with limit and offset per stage
    const results = await Promise.all(
      stageIds.map(async (sid) => {
        const query = managerId ? GET_LEADS_BY_MANAGER_AND_STAGE_QUERY : GET_LEADS_BY_STAGE_QUERY;
        const variables = managerId
          ? { managerId, stageId: sid, limit: limitPerStage, offset: offsetPerStage }
          : { stageId: sid, limit: limitPerStage, offset: offsetPerStage };
        const data = await hasuraQuery<any>(query, variables);
        return (data.crm_leads ?? []).map((lead: any) => mapLead(lead));
      })
    );

    // Flatten results and sort by date_created desc
    return results.flat().sort((a, b) => 
      new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
    );
  }

  static async addLeadToTab(
    managerId: number,
    leadId: string,
    tab: LeadTab,
    trackingDate?: string
  ): Promise<Lead> {
    const dateToUse = trackingDate ?? new Date().toISOString().split("T")[0];
    await hasuraQuery<any>(ADD_LEAD_TO_TAB_MUTATION, { managerId, leadId, tab, trackingDate: dateToUse });

    // Update is_hot when adding to HOT_LEAD tab
    if (tab === "HOT_LEAD") {
      await hasuraQuery<any>(UPDATE_LEAD_IS_HOT_MUTATION, { leadId, isHot: true });
    }

    return this.getLeadById(leadId, managerId, dateToUse);
  }

  static async removeLeadFromTab(
    managerId: number,
    leadId: string,
    tab: LeadTab,
    trackingDate?: string
  ): Promise<boolean> {
    const dateToUse = trackingDate ?? new Date().toISOString().split("T")[0];
    
    // For HOT_LEAD and LIVE_OFFER, deactivate instead of delete to preserve history
    if (tab === "HOT_LEAD" || tab === "LIVE_OFFER") {
      const data = await hasuraQuery<any>(DEACTIVATE_LEAD_FROM_TAB_MUTATION, {
        managerId,
        leadId,
        tab,
      });
      const deactivated = (data.update_manager_lead_tracking?.affected_rows ?? 0) > 0;

      // Update is_hot when deactivating from HOT_LEAD tab
      if (deactivated && tab === "HOT_LEAD") {
        await hasuraQuery<any>(UPDATE_LEAD_IS_HOT_MUTATION, { leadId, isHot: false });
      }

      return deactivated;
    }

    // For other tabs, delete the record
    const data = await hasuraQuery<any>(REMOVE_LEAD_FROM_TAB_MUTATION, {
      managerId,
      leadId,
      tab,
      trackingDate: dateToUse,
    });
    return (data.delete_manager_lead_tracking?.affected_rows ?? 0) > 0;
  }

  static async updateLeadRating(
    leadId: string,
    rating: LeadTeamRating | null
  ): Promise<Lead> {
    await hasuraQuery<any>(UPDATE_LEAD_RATING_MUTATION, {
      leadId,
      rating: rating?.toLowerCase() ?? null,
    });
    return this.getLeadById(leadId);
  }

  static async updateLeadIsHot(leadId: string, isHot: boolean, managerId: number): Promise<Lead> {
    // Update is_hot in crm_leads
    await hasuraQuery<any>(UPDATE_LEAD_IS_HOT_MUTATION, { leadId, isHot });

    // Update manager_lead_tracking
    if (isHot) {
      // Add to HOT_LEAD tab (will handle duplicates via upsert)
      await this.addLeadToTab(managerId, leadId, "HOT_LEAD");
    } else {
      // Deactivate from HOT_LEAD tab
      await hasuraQuery<any>(DEACTIVATE_LEAD_FROM_TAB_MUTATION, {
        managerId,
        leadId,
        tab: "HOT_LEAD",
      });
    }

    return this.getLeadById(leadId);
  }

  static async addLeadNote(
    leadId: string,
    content: string,
    createdBy: number,
    trackingDate?: string
  ): Promise<LeadNote> {
    const dateToUse = trackingDate ?? new Date().toISOString().split("T")[0];
    const timestamp = new Date().toISOString();
    const notes = { content, timestamp };

    // Get zoho_lead_id for crm_activities.lead_id (text field)
    const leadData = await hasuraQuery<any>(
      `query GetLeadZohoId($leadId: uuid!) { crm_leads_by_pk(id: $leadId) { zoho_lead_id } }`,
      { leadId }
    );
    const zohoLeadId = leadData.crm_leads_by_pk?.zoho_lead_id;
    if (!zohoLeadId) {
      throw new Error("Lead not found or missing zoho_lead_id");
    }

    const data = await hasuraQuery<any>(ADD_LEAD_NOTE_MUTATION, {
      zohoLeadId,
      notes,
      createdBy,
      trackingDate: dateToUse,
    });

    return parseNote(data.insert_crm_activities_one);
  }

  static async updateTrackingNote(noteId: number, content: string): Promise<LeadNote> {
    const timestamp = new Date().toISOString();
    const notes = { content, timestamp };

    const data = await hasuraQuery<any>(UPDATE_TRACKING_NOTE_MUTATION, {
      noteId,
      notes,
    });

    if (!data.update_crm_activities_by_pk) {
      throw new Error("Note not found");
    }

    return parseNote(data.update_crm_activities_by_pk);
  }

  static async deleteTrackingNote(noteId: number): Promise<boolean> {
    const data = await hasuraQuery<any>(DELETE_TRACKING_NOTE_MUTATION, { noteId });
    return !!data.delete_crm_activities_by_pk;
  }

  private static async getLeadById(leadId: string, managerId?: number, trackingDate?: string): Promise<Lead> {
    const data = await hasuraQuery<any>(LEAD_BY_ID_QUERY, { leadId });
    const lead = data.crm_leads_by_pk;
    const tabs = (data.manager_lead_tracking ?? []).map((t: any) => t.tab as LeadTab);

    // Fetch activities using zoho_lead_id (text) since crm_activities.lead_id is text
    let notes: LeadNote[] = [];
    if (lead?.zoho_lead_id) {
      const activitiesData = await hasuraQuery<any>(LEAD_ACTIVITIES_BY_ZOHO_ID_QUERY, { 
        zohoLeadId: lead.zoho_lead_id 
      });
      notes = (activitiesData.crm_activities ?? []).map(parseNote);
    }

    return mapLead(lead, tabs, notes);
  }
}
