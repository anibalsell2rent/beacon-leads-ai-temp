import { hasuraQuery } from "../utils/hasura.client";
import { Timeframe } from "./teamPerformance.service";
import {
  DateRange,
  GoalMetric,
  ZohoPerformanceGoal,
  getDateRange,
  fetchZohoPerformanceGoals,
  filterGoalsByDateRange,
  buildGoalsByEmail,
  createMetric,
} from "../utils/zoho-goals.utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SellerManagerGoals {
  userId: number;
  email: string;
  name: string;
  initials: string;
  goalId: string | null;
  goalName: string | null;
  startingDate: string | null;
  endDate: string | null;
  attendedBookings: GoalMetric;
  offersPresented: GoalMetric;
  offersAccepted: GoalMetric;
  psasExecuted: GoalMetric;
  leadsConverted: GoalMetric;
  avgNetRevenue: GoalMetric;
  totalLeads: GoalMetric;
}

export interface TeamPerformanceGoals {
  attendedBookings: GoalMetric;
  offersPresented: GoalMetric;
  offersAccepted: GoalMetric;
  psasExecuted: GoalMetric;
  leadsConverted: GoalMetric;
  avgNetRevenue: GoalMetric;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const SELLER_MANAGER_ROLE_ID = "07ed4242-3905-4136-b225-4f9b3a6137af";

const METRICS_QUERY = `
  query PerformanceGoalsMetrics($tsStartTz: timestamptz!, $tsEndTz: timestamptz!, $dateStart: date!, $dateEnd: date!, $userIds: [Int!]!) {
    users(where: { id: { _in: $userIds } }) { id email }
    bookingLeads: crm_leads(where: { seller_manager_id: { _in: $userIds }, scheduled_booking_date: { _gte: $tsStartTz, _lte: $tsEndTz }, result: { _ilike: "%Contacted%" } }) {
      seller_manager_id
    }
    convertedLeads: crm_leads(where: { result: { _eq: "Converted" }, seller_manager_id: { _in: $userIds }, date_created: { _gte: $tsStartTz, _lte: $tsEndTz } }) {
      seller_manager_id
    }
    managerLeads: crm_leads(where: { seller_manager_id: { _in: $userIds } }) { id seller_manager_id }
    totalLeads: crm_leads(where: { seller_manager_id: { _in: $userIds }, date_created: { _gte: $tsStartTz, _lte: $tsEndTz } }) { id seller_manager_id }
    crm_deals(where: { _or: [
      { offer_presented_date: { _gte: $dateStart, _lte: $dateEnd } },
      { offer_accepted_date: { _gte: $dateStart, _lte: $dateEnd } },
      { psa_execution_date: { _gte: $dateStart, _lte: $dateEnd } }
    ]}) {
      lead_id offer_presented_date offer_accepted_date psa_execution_date s2r_net_revenue
    }
  }
`;

// ─── Helpers ───────────────────────────────────────────────────────────────────

interface MetricsData {
  users: { id: number; email: string | null }[];
  bookingLeads: { seller_manager_id: number | null }[];
  convertedLeads: { seller_manager_id: number | null }[];
  managerLeads: { id: string; seller_manager_id: number | null }[];
  totalLeads: { id: string; seller_manager_id: number | null }[];
  crm_deals: { lead_id: string | null; offer_presented_date: string | null; offer_accepted_date: string | null; psa_execution_date: string | null; s2r_net_revenue: string | null }[];
}

function buildManagerLeadMap(leads: { id: string; seller_manager_id: number | null }[]): Map<number, Set<string>> {
  const map = new Map<number, Set<string>>();
  for (const lead of leads) {
    if (!lead.seller_manager_id) continue;
    const mgr = Number(lead.seller_manager_id);
    if (!map.has(mgr)) map.set(mgr, new Set());
    map.get(mgr)!.add(String(lead.id));
  }
  return map;
}

function countByManager(leads: { seller_manager_id: number | null }[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const lead of leads) {
    if (!lead.seller_manager_id) continue;
    const mgr = Number(lead.seller_manager_id);
    map.set(mgr, (map.get(mgr) || 0) + 1);
  }
  return map;
}

async function getSellerManagers(): Promise<{ id: number; email: string; first_name: string | null; last_name: string | null; initials: string | null }[]> {
  const data = await hasuraQuery<{ users: { id: number; email: string; first_name: string | null; last_name: string | null; initials: string | null; role_id: string | null; role: string | null }[] }>(
    `query GetSellerManagers { users { id email first_name last_name initials role_id role } }`
  );
  return data.users.filter((u) => u.role_id === SELLER_MANAGER_ROLE_ID || u.role?.toUpperCase() === "MANAGER" || u.role?.toUpperCase() === "SELLER_MANAGER");
}

function processDeals(
  deals: MetricsData["crm_deals"],
  managerLeadMap: Map<number, Set<string>>,
  userIds: number[]
): {
  offersPresentedMap: Map<number, number>;
  offersAcceptedMap: Map<number, number>;
  psasExecutedMap: Map<number, number>;
  revenueMap: Map<number, { total: number; count: number }>;
} {
  const offersPresentedMap = new Map<number, number>();
  const offersAcceptedMap = new Map<number, number>();
  const psasExecutedMap = new Map<number, number>();
  const revenueMap = new Map<number, { total: number; count: number }>();

  for (const userId of userIds) {
    offersPresentedMap.set(userId, 0);
    offersAcceptedMap.set(userId, 0);
    psasExecutedMap.set(userId, 0);
    revenueMap.set(userId, { total: 0, count: 0 });
  }

  for (const deal of deals) {
    if (!deal.lead_id) continue;
    for (const [mgrId, leadIds] of managerLeadMap.entries()) {
      if (leadIds.has(String(deal.lead_id))) {
        if (deal.offer_presented_date) offersPresentedMap.set(mgrId, (offersPresentedMap.get(mgrId) || 0) + 1);
        if (deal.offer_accepted_date) offersAcceptedMap.set(mgrId, (offersAcceptedMap.get(mgrId) || 0) + 1);
        if (deal.psa_execution_date) psasExecutedMap.set(mgrId, (psasExecutedMap.get(mgrId) || 0) + 1);
        if (deal.s2r_net_revenue) {
          const revenue = parseFloat(deal.s2r_net_revenue) || 0;
          const current = revenueMap.get(mgrId) || { total: 0, count: 0 };
          revenueMap.set(mgrId, { total: current.total + revenue, count: current.count + 1 });
        }
        break;
      }
    }
  }
  return { offersPresentedMap, offersAcceptedMap, psasExecutedMap, revenueMap };
}

function buildManagerGoal(
  manager: { id: number; email: string; first_name: string | null; last_name: string | null; initials: string | null },
  goal: ZohoPerformanceGoal | undefined,
  metrics: { bookings: number; offersPresented: number; offersAccepted: number; psasExecuted: number; leadsConverted: number; avgRevenue: number; totalLeads: number }
): SellerManagerGoals {
  return {
    userId: manager.id,
    email: manager.email,
    name: `${manager.first_name ?? ""} ${manager.last_name ?? ""}`.trim() || manager.email,
    initials: manager.initials ?? (`${manager.first_name?.[0] ?? ""}${manager.last_name?.[0] ?? ""}` || "SM"),
    goalId: goal?.id ?? null,
    goalName: goal?.Name ?? null,
    startingDate: goal?.Starting_Date ?? null,
    endDate: goal?.End_Date ?? null,
    attendedBookings: createMetric(metrics.bookings, goal?.Bookings_Attended_Target ?? null, metrics.totalLeads),
    offersPresented: createMetric(metrics.offersPresented, goal?.Offers_Presented_Target ?? null, metrics.totalLeads),
    offersAccepted: createMetric(metrics.offersAccepted, goal?.Offers_Accepted_Target ?? null, metrics.totalLeads),
    psasExecuted: createMetric(metrics.psasExecuted, goal?.PSA_s_Executed_Target ?? null, metrics.totalLeads),
    leadsConverted: createMetric(metrics.leadsConverted, goal?.Converted_Leads_Target ?? null, metrics.totalLeads),
    avgNetRevenue: createMetric(metrics.avgRevenue, goal?.Revenue_Target ?? null),
    totalLeads: createMetric(metrics.totalLeads, goal?.Total_Leads_Target ?? null),
  };
}

// ─── Service ───────────────────────────────────────────────────────────────────

export class PerformanceGoalsService {
  static async getPerformanceGoals(timeframe: Timeframe): Promise<{ teamGoals: TeamPerformanceGoals; managerGoals: SellerManagerGoals[] }> {
    const range = getDateRange(timeframe);
    const [zohoGoals, sellerManagers] = await Promise.all([fetchZohoPerformanceGoals(), getSellerManagers()]);
    const filteredGoals = filterGoalsByDateRange(zohoGoals, range);
    const goalsByEmail = buildGoalsByEmail(filteredGoals);
    const userIds = sellerManagers.map((u) => u.id);

    const data = await this.fetchMetrics(range, userIds);
    const managerLeadMap = buildManagerLeadMap(data.managerLeads);
    const bookingsMap = countByManager(data.bookingLeads);
    const leadsConvertedMap = countByManager(data.convertedLeads);
    const totalLeadsMap = countByManager(data.totalLeads);
    const { offersPresentedMap, offersAcceptedMap, psasExecutedMap, revenueMap } = processDeals(data.crm_deals, managerLeadMap, userIds);

    const managerGoals: SellerManagerGoals[] = [];
    const totals = { bookings: 0, offersPresented: 0, offersAccepted: 0, psasExecuted: 0, leadsConverted: 0, revenue: 0, totalLeads: 0, targets: { bookings: 0, offersPresented: 0, offersAccepted: 0, psasExecuted: 0, leadsConverted: 0, revenue: 0 } };

    for (const manager of sellerManagers) {
      const email = manager.email?.toLowerCase();
      const goal = email ? goalsByEmail.get(email) : undefined;
      const revenueData = revenueMap.get(manager.id) || { total: 0, count: 0 };
      const metrics = {
        bookings: bookingsMap.get(manager.id) || 0,
        offersPresented: offersPresentedMap.get(manager.id) || 0,
        offersAccepted: offersAcceptedMap.get(manager.id) || 0,
        psasExecuted: psasExecutedMap.get(manager.id) || 0,
        leadsConverted: leadsConvertedMap.get(manager.id) || 0,
        avgRevenue: revenueData.count > 0 ? revenueData.total / revenueData.count : 0,
        totalLeads: totalLeadsMap.get(manager.id) || 0,
      };

      managerGoals.push(buildManagerGoal(manager, goal, metrics));

      totals.bookings += metrics.bookings;
      totals.offersPresented += metrics.offersPresented;
      totals.offersAccepted += metrics.offersAccepted;
      totals.psasExecuted += metrics.psasExecuted;
      totals.leadsConverted += metrics.leadsConverted;
      totals.revenue += metrics.avgRevenue;
      totals.totalLeads += metrics.totalLeads;
      totals.targets.bookings += goal?.Bookings_Attended_Target ?? 0;
      totals.targets.offersPresented += goal?.Offers_Presented_Target ?? 0;
      totals.targets.offersAccepted += goal?.Offers_Accepted_Target ?? 0;
      totals.targets.psasExecuted += goal?.PSA_s_Executed_Target ?? 0;
      totals.targets.leadsConverted += goal?.Converted_Leads_Target ?? 0;
      totals.targets.revenue += goal?.Revenue_Target ?? 0;
    }

    const teamGoals: TeamPerformanceGoals = {
      attendedBookings: createMetric(totals.bookings, totals.targets.bookings, totals.totalLeads),
      offersPresented: createMetric(totals.offersPresented, totals.targets.offersPresented, totals.totalLeads),
      offersAccepted: createMetric(totals.offersAccepted, totals.targets.offersAccepted, totals.totalLeads),
      psasExecuted: createMetric(totals.psasExecuted, totals.targets.psasExecuted, totals.totalLeads),
      leadsConverted: createMetric(totals.leadsConverted, totals.targets.leadsConverted, totals.totalLeads),
      avgNetRevenue: createMetric(totals.revenue, totals.targets.revenue),
    };

    return { teamGoals, managerGoals };
  }

  static async getPerformanceGoalsByEmail(email: string, timeframe: Timeframe): Promise<SellerManagerGoals | null> {
    const result = await this.getPerformanceGoals(timeframe);
    return result.managerGoals.find((m) => m.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  private static async fetchMetrics(range: DateRange, userIds: number[]): Promise<MetricsData> {
    const start = range.start.toISOString();
    const end = range.end.toISOString();
    return hasuraQuery<MetricsData>(METRICS_QUERY, { tsStartTz: start, tsEndTz: end, dateStart: start.split("T")[0], dateEnd: end.split("T")[0], userIds });
  }
}
