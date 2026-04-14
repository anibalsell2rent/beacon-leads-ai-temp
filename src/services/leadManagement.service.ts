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

type ManagerLeadTab = "HOT_LEAD" | "LIVE_OFFER" | "PIPELINE_FOLLOW_UP" | "NEW_LEAD";
type LeadTeamRating = "AMAZING" | "GOOD" | "NEUTRAL" | "BAD";

interface LeadNote {
  content: string;
  timestamp: string;
}

interface LeadUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  slug: string | null;
  initials: string | null;
}

interface Lead {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  propertyType: string | null;
  leadSource: string | null;
  leadStatus: string | null;
  result: string | null;
  dateCreated: string | null;
  lastActivityDate: string | null;
  scheduledBookingDate: string | null;
  sellerManager: LeadUser | null;
  sellerAdvisor: LeadUser | null;
  leadTeamRating: LeadTeamRating | null;
  notes: LeadNote[];
  currentTabs: ManagerLeadTab[];
}

interface PerformanceMetric {
  actual: number;
  target: number;
  percentage: number;
  conversionRate?: number;
}

interface UserPerformance {
  userId: number;
  email: string;
  name: string;
  slug: string | null;
  initials: string | null;
  offersPresented: PerformanceMetric;
  offersAccepted: PerformanceMetric;
  psasExecuted: PerformanceMetric;
  leadsConverted: PerformanceMetric;
}

interface TabCount {
  tab: ManagerLeadTab;
  count: number;
}

interface ManagerLeadsResponse {
  leads: {
    leads: Lead[];
    totalCount: number;
    hasNextPage: boolean;
  };
  tabCounts: TabCount[];
}

// ─── Queries ───────────────────────────────────────────────────────────────────

const MANAGER_LEADS_QUERY = `
  query GetManagerLeads($managerId: Int!, $tab: String, $limit: Int!, $offset: Int!) {
    manager_lead_tracking(
      where: {
        manager_id: { _eq: $managerId }
        tab: { _eq: $tab }
      }
      limit: $limit
      offset: $offset
      order_by: { added_at: desc }
    ) {
      lead_id
      tab
      crm_lead {
        id
        full_name
        email
        phone
        address
        city
        state
        zip_code
        property_type
        lead_source
        lead_status
        result
        date_created
        last_activity_date
        scheduled_booking_date
        lead_team_rating
        seller_manager {
          id
          email
          first_name
          last_name
          slug
          initials
        }
        seller_advisor {
          id
          email
          first_name
          last_name
          slug
          initials
        }
      }
    }
    manager_lead_tracking_aggregate(
      where: {
        manager_id: { _eq: $managerId }
        tab: { _eq: $tab }
      }
    ) {
      aggregate { count }
    }
    hot_lead: manager_lead_tracking_aggregate(where: { manager_id: { _eq: $managerId }, tab: { _eq: "HOT_LEAD" } }) {
      aggregate { count }
    }
    live_offer: manager_lead_tracking_aggregate(where: { manager_id: { _eq: $managerId }, tab: { _eq: "LIVE_OFFER" } }) {
      aggregate { count }
    }
    pipeline_follow_up: manager_lead_tracking_aggregate(where: { manager_id: { _eq: $managerId }, tab: { _eq: "PIPELINE_FOLLOW_UP" } }) {
      aggregate { count }
    }
    new_lead: manager_lead_tracking_aggregate(where: { manager_id: { _eq: $managerId }, tab: { _eq: "NEW_LEAD" } }) {
      aggregate { count }
    }
  }
`;

const ALL_MANAGER_LEADS_QUERY = `
  query GetAllManagerLeads($managerId: Int!, $limit: Int!, $offset: Int!) {
    manager_lead_tracking(
      where: { manager_id: { _eq: $managerId } }
      limit: $limit
      offset: $offset
      order_by: { added_at: desc }
    ) {
      lead_id
      tab
      crm_lead {
        id
        full_name
        email
        phone
        address
        city
        state
        zip_code
        property_type
        lead_source
        lead_status
        result
        date_created
        last_activity_date
        scheduled_booking_date
        lead_team_rating
        seller_manager {
          id
          email
          first_name
          last_name
          slug
          initials
        }
        seller_advisor {
          id
          email
          first_name
          last_name
          slug
          initials
        }
      }
    }
    manager_lead_tracking_aggregate(where: { manager_id: { _eq: $managerId } }) {
      aggregate { count }
    }
    hot_lead: manager_lead_tracking_aggregate(where: { manager_id: { _eq: $managerId }, tab: { _eq: "HOT_LEAD" } }) {
      aggregate { count }
    }
    live_offer: manager_lead_tracking_aggregate(where: { manager_id: { _eq: $managerId }, tab: { _eq: "LIVE_OFFER" } }) {
      aggregate { count }
    }
    pipeline_follow_up: manager_lead_tracking_aggregate(where: { manager_id: { _eq: $managerId }, tab: { _eq: "PIPELINE_FOLLOW_UP" } }) {
      aggregate { count }
    }
    new_lead: manager_lead_tracking_aggregate(where: { manager_id: { _eq: $managerId }, tab: { _eq: "NEW_LEAD" } }) {
      aggregate { count }
    }
  }
`;

const LEAD_DETAILS_QUERY = `
  query GetLeadDetails($leadId: uuid!) {
    crm_leads_by_pk(id: $leadId) {
      id
      full_name
      email
      phone
      address
      city
      state
      zip_code
      property_type
      lead_source
      lead_status
      result
      date_created
      last_activity_date
      scheduled_booking_date
      lead_team_rating
      seller_manager {
        id
        email
        first_name
        last_name
        slug
        initials
      }
      seller_advisor {
        id
        email
        first_name
        last_name
        slug
        initials
      }
    }
    crm_activities(
      where: { lead_id: { _eq: $leadId }, activity_type_id: { _eq: 4 } }
      order_by: { created_at: desc }
    ) {
      notes
      created_at
    }
    manager_lead_tracking(where: { lead_id: { _eq: $leadId } }) {
      tab
    }
  }
`;

const MANAGER_INFO_QUERY = `
  query GetManagerInfo($managerId: Int!) {
    users_by_pk(id: $managerId) {
      id
      email
      first_name
      last_name
      slug
      initials
    }
  }
`;

const ADD_LEAD_TO_TAB_MUTATION = `
  mutation AddLeadToTab($managerId: Int!, $leadId: uuid!, $tab: String!) {
    insert_manager_lead_tracking_one(
      object: { manager_id: $managerId, lead_id: $leadId, tab: $tab }
      on_conflict: { constraint: manager_lead_tracking_manager_id_lead_id_tab_key, update_columns: [] }
    ) {
      id
    }
  }
`;

const REMOVE_LEAD_FROM_TAB_MUTATION = `
  mutation RemoveLeadFromTab($managerId: Int!, $leadId: uuid!, $tab: String!) {
    delete_manager_lead_tracking(
      where: {
        manager_id: { _eq: $managerId }
        lead_id: { _eq: $leadId }
        tab: { _eq: $tab }
      }
    ) {
      affected_rows
    }
  }
`;

const UPDATE_LEAD_RATING_MUTATION = `
  mutation UpdateLeadRating($leadId: uuid!, $rating: String!) {
    update_crm_leads_by_pk(
      pk_columns: { id: $leadId }
      _set: { lead_team_rating: $rating }
    ) {
      id
      lead_team_rating
    }
  }
`;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function mapUser(user: any): LeadUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    slug: user.slug,
    initials: user.initials,
  };
}

function mapLead(leadData: any, tabs: ManagerLeadTab[] = []): Lead {
  const lead = leadData.crm_lead || leadData;
  return {
    id: lead.id,
    fullName: lead.full_name,
    email: lead.email,
    phone: lead.phone,
    address: lead.address,
    city: lead.city,
    state: lead.state,
    zipCode: lead.zip_code,
    propertyType: lead.property_type,
    leadSource: lead.lead_source,
    leadStatus: lead.lead_status,
    result: lead.result,
    dateCreated: lead.date_created,
    lastActivityDate: lead.last_activity_date,
    scheduledBookingDate: lead.scheduled_booking_date,
    sellerManager: mapUser(lead.seller_manager),
    sellerAdvisor: mapUser(lead.seller_advisor),
    leadTeamRating: lead.lead_team_rating?.toUpperCase() as LeadTeamRating | null,
    notes: [],
    currentTabs: tabs,
  };
}

function parseNotes(activities: any[]): LeadNote[] {
  return activities
    .map((activity) => {
      try {
        const notesData = typeof activity.notes === "string" 
          ? JSON.parse(activity.notes) 
          : activity.notes;
        return {
          content: notesData?.content ?? "",
          timestamp: notesData?.timestamp ?? activity.created_at,
        };
      } catch {
        return {
          content: activity.notes ?? "",
          timestamp: activity.created_at,
        };
      }
    })
    .filter((note) => note.content);
}

// ─── Service ───────────────────────────────────────────────────────────────────

export class LeadManagementService {
  static async getManagerLeads(
    managerId: number,
    tab?: ManagerLeadTab,
    limit = 20,
    offset = 0
  ): Promise<ManagerLeadsResponse> {
    const query = tab ? MANAGER_LEADS_QUERY : ALL_MANAGER_LEADS_QUERY;
    const variables = tab
      ? { managerId, tab, limit, offset }
      : { managerId, limit, offset };

    const data = await hasuraQuery<any>(query, variables);

    const leadsData = data.manager_lead_tracking ?? [];
    const totalCount = data.manager_lead_tracking_aggregate?.aggregate?.count ?? 0;

    const leads = leadsData.map((item: any) => {
      const currentTab = item.tab as ManagerLeadTab;
      return mapLead(item, [currentTab]);
    });

    return {
      leads: {
        leads,
        totalCount,
        hasNextPage: offset + limit < totalCount,
      },
      tabCounts: [
        { tab: "HOT_LEAD", count: data.hot_lead?.aggregate?.count ?? 0 },
        { tab: "LIVE_OFFER", count: data.live_offer?.aggregate?.count ?? 0 },
        { tab: "PIPELINE_FOLLOW_UP", count: data.pipeline_follow_up?.aggregate?.count ?? 0 },
        { tab: "NEW_LEAD", count: data.new_lead?.aggregate?.count ?? 0 },
      ],
    };
  }

  static async getLeadDetails(leadId: string): Promise<Lead | null> {
    const data = await hasuraQuery<any>(LEAD_DETAILS_QUERY, { leadId });

    const leadData = data.crm_leads_by_pk;
    if (!leadData) return null;

    const tabs = (data.manager_lead_tracking ?? []).map(
      (t: any) => t.tab as ManagerLeadTab
    );
    const notes = parseNotes(data.crm_activities ?? []);

    const lead = mapLead(leadData, tabs);
    lead.notes = notes;

    return lead;
  }

  static async getManagerPerformance(
    managerId: number,
    timeframe: Timeframe
  ): Promise<UserPerformance | null> {
    const managerData = await hasuraQuery<any>(MANAGER_INFO_QUERY, { managerId });
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
      email: manager.email,
      name: `${manager.first_name ?? ""} ${manager.last_name ?? ""}`.trim(),
      slug: manager.slug,
      initials: manager.initials,
      offersPresented: createMetric(actuals.offersPresented, goal?.Offers_Presented_Target ?? null),
      offersAccepted: createMetric(actuals.offersAccepted, goal?.Offers_Accepted_Target ?? null),
      psasExecuted: createMetric(actuals.psasExecuted, goal?.PSA_s_Executed_Target ?? null),
      leadsConverted: createMetric(actuals.convertedLeads, goal?.Converted_Leads_Target ?? null),
    };
  }

  static async addLeadToTab(
    managerId: number,
    leadId: string,
    tab: ManagerLeadTab
  ): Promise<boolean> {
    try {
      await hasuraQuery<any>(ADD_LEAD_TO_TAB_MUTATION, { managerId, leadId, tab });
      return true;
    } catch (error) {
      console.error("[LeadManagement] Error adding lead to tab:", error);
      return false;
    }
  }

  static async removeLeadFromTab(
    managerId: number,
    leadId: string,
    tab: ManagerLeadTab
  ): Promise<boolean> {
    try {
      const data = await hasuraQuery<any>(REMOVE_LEAD_FROM_TAB_MUTATION, {
        managerId,
        leadId,
        tab,
      });
      return (data.delete_manager_lead_tracking?.affected_rows ?? 0) > 0;
    } catch (error) {
      console.error("[LeadManagement] Error removing lead from tab:", error);
      return false;
    }
  }

  static async updateLeadTeamRating(
    leadId: string,
    rating: LeadTeamRating
  ): Promise<Lead | null> {
    try {
      await hasuraQuery<any>(UPDATE_LEAD_RATING_MUTATION, {
        leadId,
        rating: rating.toLowerCase(),
      });
      return this.getLeadDetails(leadId);
    } catch (error) {
      console.error("[LeadManagement] Error updating lead rating:", error);
      return null;
    }
  }
}
