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
      where: { manager_id: { _eq: $managerId }, tab: { _eq: "HOT_LEAD" }, tracking_date: { _eq: $trackingDate } }
      order_by: { added_at: desc }
    ) {
      lead_id tab added_at tracking_date
      crm_lead {
        id lead_team_rating stage_id lead_status date_created updated_at
        lead_score s2r_net_revenue seller_segment marketing_source
        seller_manager_id
        seller_manager { id first_name last_name }
        crm_seller { first_name last_name email phone address city state zip_code }
      }
    }
    liveOffers: manager_lead_tracking(
      where: { manager_id: { _eq: $managerId }, tab: { _eq: "LIVE_OFFER" }, tracking_date: { _eq: $trackingDate } }
      order_by: { added_at: desc }
    ) {
      lead_id tab added_at tracking_date
      crm_lead {
        id lead_team_rating stage_id lead_status date_created updated_at
        lead_score s2r_net_revenue seller_segment marketing_source
        seller_manager_id
        seller_manager { id first_name last_name }
        crm_seller { first_name last_name email phone address city state zip_code }
      }
    }
    pipelineFollowUps: manager_lead_tracking(
      where: { manager_id: { _eq: $managerId }, tab: { _eq: "PIPELINE_FOLLOW_UP" }, tracking_date: { _eq: $trackingDate } }
      order_by: { added_at: desc }
    ) {
      lead_id tab added_at tracking_date
      crm_lead {
        id lead_team_rating stage_id lead_status date_created updated_at
        lead_score s2r_net_revenue seller_segment marketing_source
        seller_manager_id
        seller_manager { id first_name last_name }
        crm_seller { first_name last_name email phone address city state zip_code }
      }
    }
    newLeads: manager_lead_tracking(
      where: { manager_id: { _eq: $managerId }, tab: { _eq: "NEW_LEAD" }, tracking_date: { _eq: $trackingDate } }
      order_by: { added_at: desc }
    ) {
      lead_id tab added_at tracking_date
      crm_lead {
        id lead_team_rating stage_id lead_status date_created updated_at
        lead_score s2r_net_revenue seller_segment marketing_source
        seller_manager_id
        seller_manager { id first_name last_name }
        crm_seller { first_name last_name email phone address city state zip_code }
      }
    }
  }
`;

const LEAD_NOTES_QUERY = `
  query GetLeadNotes($leadIds: [uuid!]!) {
    crm_activities(
      where: { lead_id: { _in: $leadIds }, activity_type_id: { _eq: 4 } }
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
      id lead_team_rating stage_id lead_status date_created updated_at
      seller_manager_id
      crm_seller {
        first_name last_name email phone address city state zip_code
      }
    }
  }
`;

const LEAD_BY_ID_QUERY = `
  query GetLeadById($leadId: uuid!) {
    crm_leads_by_pk(id: $leadId) {
      id lead_team_rating stage_id lead_status date_created updated_at
      lead_score s2r_net_revenue seller_segment marketing_source
      seller_manager_id
      crm_seller {
        first_name last_name email phone address city state zip_code
      }
    }
    crm_activities(
      where: { lead_id: { _eq: $leadId }, activity_type_id: { _eq: 4 } }
      order_by: { created_at: desc }
    ) {
      id notes created_at created_by
      user { first_name last_name }
    }
    manager_lead_tracking(where: { lead_id: { _eq: $leadId } }) {
      tab
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

const ADD_LEAD_NOTE_MUTATION = `
  mutation AddLeadNote($leadId: uuid!, $notes: jsonb!, $createdBy: Int!) {
    insert_crm_activities_one(
      object: {
        lead_id: $leadId
        activity_type_id: 4
        notes: $notes
        created_by: $createdBy
        seller_id: $createdBy
      }
    ) {
      id notes created_at created_by
      user { first_name last_name }
    }
  }
`;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function mapLead(data: any, tabs: LeadTab[] = [], notes: LeadNote[] = []): Lead {
  const lead = data.crm_lead || data;
  const seller = lead.crm_seller;
  const manager = lead.seller_manager;

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
    address: seller?.address ?? null,
    city: seller?.city ?? null,
    state: seller?.state ?? null,
    zipCode: seller?.zip_code ?? null,
    leadTeamRating: lead.lead_team_rating?.toUpperCase() as LeadTeamRating | null,
    stageId: lead.stage_id,
    stageName: lead.lead_status,
    assignedTo: lead.seller_manager_id,
    assignedToName,
    leadScore: lead.lead_score,
    s2rNetRevenue: lead.s2r_net_revenue,
    sellerSegment: lead.seller_segment,
    marketingSource: lead.marketing_source,
    dateCreated: lead.date_created,
    updatedAt: lead.updated_at,
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

    return {
      id: user.id,
      slug: user.slug ?? "",
      name: `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim(),
      email: user.email ?? "",
      initials: user.initials ?? "",
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

    return {
      userId: manager.id,
      email: manager.email ?? "",
      name: `${manager.first_name ?? ""} ${manager.last_name ?? ""}`.trim(),
      slug: manager.slug ?? "",
      initials: manager.initials ?? "",
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

    const allLeadIds = [
      ...(data.hotLeads ?? []),
      ...(data.liveOffers ?? []),
      ...(data.pipelineFollowUps ?? []),
      ...(data.newLeads ?? []),
    ].map((item: any) => item.crm_lead?.id).filter(Boolean);

    const uniqueLeadIds = [...new Set(allLeadIds)];

    // Fetch notes and tabs for all leads
    const [notesData, tabsData] = await Promise.all([
      uniqueLeadIds.length > 0
        ? hasuraQuery<any>(LEAD_NOTES_QUERY, { leadIds: uniqueLeadIds })
        : { crm_activities: [] },
      hasuraQuery<any>(LEAD_TABS_QUERY, { leadIds: uniqueLeadIds, managerId, trackingDate: dateToUse }),
    ]);

    // Group notes by lead_id
    const notesByLead = new Map<string, LeadNote[]>();
    for (const activity of notesData.crm_activities ?? []) {
      const leadId = activity.lead_id;
      if (!notesByLead.has(leadId)) notesByLead.set(leadId, []);
      notesByLead.get(leadId)!.push(parseNote(activity));
    }

    // Group tabs by lead_id
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

  static async addLeadToTab(
    managerId: number,
    leadId: string,
    tab: LeadTab,
    trackingDate?: string
  ): Promise<Lead> {
    const dateToUse = trackingDate ?? new Date().toISOString().split("T")[0];
    await hasuraQuery<any>(ADD_LEAD_TO_TAB_MUTATION, { managerId, leadId, tab, trackingDate: dateToUse });
    return this.getLeadById(leadId, managerId, dateToUse);
  }

  static async removeLeadFromTab(
    managerId: number,
    leadId: string,
    tab: LeadTab,
    trackingDate?: string
  ): Promise<boolean> {
    const dateToUse = trackingDate ?? new Date().toISOString().split("T")[0];
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

  static async addLeadNote(
    leadId: string,
    content: string,
    createdBy: number
  ): Promise<LeadNote> {
    const timestamp = new Date().toISOString();
    const notes = { content, timestamp };

    const data = await hasuraQuery<any>(ADD_LEAD_NOTE_MUTATION, {
      leadId,
      notes,
      createdBy,
    });

    return parseNote(data.insert_crm_activities_one);
  }

  private static async getLeadById(leadId: string, managerId?: number, trackingDate?: string): Promise<Lead> {
    const data = await hasuraQuery<any>(LEAD_BY_ID_QUERY, { leadId });

    const lead = data.crm_leads_by_pk;
    const notes = (data.crm_activities ?? []).map(parseNote);
    const tabs = (data.manager_lead_tracking ?? []).map((t: any) => t.tab as LeadTab);

    return mapLead(lead, tabs, notes);
  }
}
