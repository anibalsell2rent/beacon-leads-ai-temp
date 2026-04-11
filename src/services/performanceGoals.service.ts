import axios from "axios";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  parseISO,
  isWithinInterval,
} from "date-fns";
import { hasuraQuery } from "../utils/hasura.client";
import { Timeframe } from "./teamPerformance.service";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ZohoOwner {
  name: string;
  id: string;
  email: string;
}

interface ZohoPerformanceGoal {
  id: string;
  Name: string;
  Owner: ZohoOwner;
  Starting_Date: string | null;
  End_Date: string | null;
  Converted_Leads_Target: number | null;
  Offers_Presented_Target: number | null;
  Offers_Accepted_Target: number | null;
  Revenue_Target: number | null;
  PSA_s_Executed_Target: number | null;
  Bookings_Attended_Target: number | null;
  Total_Leads_Target: number | null;
}

interface ZohoResponse {
  data: ZohoPerformanceGoal[];
  info?: {
    per_page: number;
    count: number;
    page: number;
    more_records: boolean;
  };
}

export interface PerformanceGoalMetric {
  actual: number;
  target: number;
  percentage: number;
  conversionRate?: number;
  targetConversionRate?: number;
}

export interface SellerManagerGoals {
  userId: number;
  email: string;
  name: string;
  initials: string;
  goalId: string | null;
  goalName: string | null;
  startingDate: string | null;
  endDate: string | null;
  attendedBookings: PerformanceGoalMetric;
  offersPresented: PerformanceGoalMetric;
  offersAccepted: PerformanceGoalMetric;
  psasExecuted: PerformanceGoalMetric;
  leadsConverted: PerformanceGoalMetric;
  avgNetRevenue: PerformanceGoalMetric;
  totalLeads: PerformanceGoalMetric;
}

export interface TeamPerformanceGoals {
  attendedBookings: PerformanceGoalMetric;
  offersPresented: PerformanceGoalMetric;
  offersAccepted: PerformanceGoalMetric;
  psasExecuted: PerformanceGoalMetric;
  leadsConverted: PerformanceGoalMetric;
  avgNetRevenue: PerformanceGoalMetric;
}

interface DateRange {
  start: Date;
  end: Date;
}

// ─── Helper Functions ──────────────────────────────────────────────────────────

const zohoToken = async (): Promise<{ data: string | null }> => {
  try {
    const request = await axios.get(
      "https://zohotoken-663034886613.us-central1.run.app/api/zoho/token"
    );
    const token = (request.data as { token?: string }).token;
    return { data: token ?? null };
  } catch (error) {
    console.error("[PerformanceGoals] Error fetching Zoho token:", error);
    return { data: null };
  }
};

// ─── Service ───────────────────────────────────────────────────────────────────

export class PerformanceGoalsService {
  private static SELLER_MANAGER_ROLE_ID = "07ed4242-3905-4136-b225-4f9b3a6137af";
  private static ACTIVITY_TYPE_CALL = 1;
  private static ACTIVITY_TYPE_SMS = 2;

  // ── Date range helper ──────────────────────────────────────────────────────
  private static getDateRange(timeframe: Timeframe): DateRange {
    const now = new Date();
    switch (timeframe) {
      case "THIS_WEEK":
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case "THIS_MONTH":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "THIS_QUARTER":
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case "YEAR_TO_DATE":
        return { start: startOfYear(now), end: now };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }

  // ── Fetch Performance Goals from Zoho ──────────────────────────────────────
  private static async fetchZohoPerformanceGoals(): Promise<ZohoPerformanceGoal[]> {
    try {
      const token = await zohoToken();
      if (!token.data) {
        console.error("[PerformanceGoals] No Zoho token available");
        return [];
      }

      const fields = [
        "id",
        "Name",
        "Owner",
        "Starting_Date",
        "End_Date",
        "Converted_Leads_Target",
        "Offers_Presented_Target",
        "Offers_Accepted_Target",
        "Revenue_Target",
        "PSA_s_Executed_Target",
        "Bookings_Attended_Target",
        "Total_Leads_Target",
      ].join(",");

      const url = `https://www.zohoapis.com/crm/v3/Performance_Goals?fields=${fields}`;

      const response = await axios.get<ZohoResponse>(url, {
        headers: {
          Authorization: `Zoho-oauthtoken ${token.data}`,
        },
      });

      if (!response.data?.data) {
        console.warn("[PerformanceGoals] No data returned from Zoho");
        return [];
      }

      return response.data.data;
    } catch (error: any) {
      console.error(
        "[PerformanceGoals] Error fetching from Zoho:",
        error?.response?.data || error.message
      );
      return [];
    }
  }

  // ── Filter goals by date range ─────────────────────────────────────────────
  private static filterGoalsByDateRange(
    goals: ZohoPerformanceGoal[],
    range: DateRange
  ): ZohoPerformanceGoal[] {
    return goals.filter((goal) => {
      if (!goal.Starting_Date || !goal.End_Date) return false;

      const goalStart = parseISO(goal.Starting_Date);
      const goalEnd = parseISO(goal.End_Date);

      // Check if the goal period overlaps with the filter range
      return (
        isWithinInterval(goalStart, { start: range.start, end: range.end }) ||
        isWithinInterval(goalEnd, { start: range.start, end: range.end }) ||
        (goalStart <= range.start && goalEnd >= range.end)
      );
    });
  }

  // ── Fetch actual metrics from database ─────────────────────────────────────
  private static async fetchActualMetrics(
    range: DateRange,
    userIds: number[]
  ): Promise<{
    bookingsMap: Map<number, number>;
    offersPresentedMap: Map<number, number>;
    offersAcceptedMap: Map<number, number>;
    psasExecutedMap: Map<number, number>;
    leadsConvertedMap: Map<number, number>;
    revenueMap: Map<number, { total: number; count: number }>;
    totalLeadsMap: Map<number, number>;
    managerLeadMap: Map<number, Set<string>>;
  }> {
    const start = range.start.toISOString();
    const end = range.end.toISOString();
    const dateStart = start.split("T")[0];
    const dateEnd = end.split("T")[0];

    const data = await hasuraQuery<{
      users: {
        id: number;
        email: string | null;
      }[];
      bookingLeads: {
        seller_manager_id: number | null;
        scheduled_booking_date: string | null;
        result: string | null;
      }[];
      convertedLeads: {
        seller_manager_id: number | null;
        date_created: string | null;
      }[];
      managerLeads: {
        id: string;
        seller_manager_id: number | null;
      }[];
      totalLeads: {
        id: string;
        seller_manager_id: number | null;
      }[];
      crm_deals: {
        lead_id: string | null;
        offer_presented_date: string | null;
        offer_accepted_date: string | null;
        psa_execution_date: string | null;
        s2r_net_revenue: string | null;
      }[];
    }>(
      `
      query PerformanceGoalsMetrics(
        $tsStartTz: timestamptz!
        $tsEndTz: timestamptz!
        $dateStart: date!
        $dateEnd: date!
        $userIds: [Int!]!
      ) {
        users(where: { id: { _in: $userIds } }) {
          id
          email
        }

        bookingLeads: crm_leads(
          where: {
            seller_manager_id: { _in: $userIds }
            scheduled_booking_date: { _gte: $tsStartTz, _lte: $tsEndTz }
            result: { _ilike: "%Contacted%" }
          }
        ) {
          seller_manager_id
          scheduled_booking_date
          result
        }

        convertedLeads: crm_leads(
          where: {
            result: { _eq: "Converted" }
            seller_manager_id: { _in: $userIds }
            date_created: { _gte: $tsStartTz, _lte: $tsEndTz }
          }
        ) {
          seller_manager_id
          date_created
        }

        managerLeads: crm_leads(
          where: { seller_manager_id: { _in: $userIds } }
        ) {
          id
          seller_manager_id
        }

        totalLeads: crm_leads(
          where: {
            seller_manager_id: { _in: $userIds }
            date_created: { _gte: $tsStartTz, _lte: $tsEndTz }
          }
        ) {
          id
          seller_manager_id
        }

        crm_deals(
          where: {
            _or: [
              { offer_presented_date: { _gte: $dateStart, _lte: $dateEnd } }
              { offer_accepted_date: { _gte: $dateStart, _lte: $dateEnd } }
              { psa_execution_date: { _gte: $dateStart, _lte: $dateEnd } }
            ]
          }
        ) {
          lead_id
          offer_presented_date
          offer_accepted_date
          psa_execution_date
          s2r_net_revenue
        }
      }
    `,
      {
        tsStartTz: start,
        tsEndTz: end,
        dateStart,
        dateEnd,
        userIds,
      }
    );

    // Build manager → lead mapping
    const managerLeadMap = new Map<number, Set<string>>();
    for (const lead of data.managerLeads) {
      if (!lead.seller_manager_id) continue;
      const mgr = Number(lead.seller_manager_id);
      if (!managerLeadMap.has(mgr)) managerLeadMap.set(mgr, new Set());
      managerLeadMap.get(mgr)!.add(String(lead.id));
    }

    // Initialize maps
    const bookingsMap = new Map<number, number>();
    const offersPresentedMap = new Map<number, number>();
    const offersAcceptedMap = new Map<number, number>();
    const psasExecutedMap = new Map<number, number>();
    const leadsConvertedMap = new Map<number, number>();
    const revenueMap = new Map<number, { total: number; count: number }>();
    const totalLeadsMap = new Map<number, number>();

    // Initialize all users with 0
    for (const userId of userIds) {
      bookingsMap.set(userId, 0);
      offersPresentedMap.set(userId, 0);
      offersAcceptedMap.set(userId, 0);
      psasExecutedMap.set(userId, 0);
      leadsConvertedMap.set(userId, 0);
      revenueMap.set(userId, { total: 0, count: 0 });
      totalLeadsMap.set(userId, 0);
    }

    // Count bookings attended
    for (const lead of data.bookingLeads) {
      if (!lead.seller_manager_id) continue;
      const mgr = Number(lead.seller_manager_id);
      bookingsMap.set(mgr, (bookingsMap.get(mgr) || 0) + 1);
    }

    // Count converted leads
    for (const lead of data.convertedLeads) {
      if (!lead.seller_manager_id) continue;
      const mgr = Number(lead.seller_manager_id);
      leadsConvertedMap.set(mgr, (leadsConvertedMap.get(mgr) || 0) + 1);
    }

    // Count total leads
    for (const lead of data.totalLeads) {
      if (!lead.seller_manager_id) continue;
      const mgr = Number(lead.seller_manager_id);
      totalLeadsMap.set(mgr, (totalLeadsMap.get(mgr) || 0) + 1);
    }

    // Process deals for each manager
    for (const deal of data.crm_deals) {
      if (!deal.lead_id) continue;

      // Find which manager owns this lead
      for (const [mgrId, leadIds] of managerLeadMap.entries()) {
        if (leadIds.has(String(deal.lead_id))) {
          // Count offers presented
          if (deal.offer_presented_date) {
            offersPresentedMap.set(
              mgrId,
              (offersPresentedMap.get(mgrId) || 0) + 1
            );
          }
          // Count offers accepted
          if (deal.offer_accepted_date) {
            offersAcceptedMap.set(
              mgrId,
              (offersAcceptedMap.get(mgrId) || 0) + 1
            );
          }
          // Count PSAs executed
          if (deal.psa_execution_date) {
            psasExecutedMap.set(mgrId, (psasExecutedMap.get(mgrId) || 0) + 1);
          }
          // Track revenue
          if (deal.s2r_net_revenue) {
            const revenue = parseFloat(deal.s2r_net_revenue) || 0;
            const current = revenueMap.get(mgrId) || { total: 0, count: 0 };
            revenueMap.set(mgrId, {
              total: current.total + revenue,
              count: current.count + 1,
            });
          }
          break;
        }
      }
    }

    return {
      bookingsMap,
      offersPresentedMap,
      offersAcceptedMap,
      psasExecutedMap,
      leadsConvertedMap,
      revenueMap,
      totalLeadsMap,
      managerLeadMap,
    };
  }

  // ── Get all seller managers from database ──────────────────────────────────
  private static async getSellerManagers(): Promise<
    {
      id: number;
      email: string;
      first_name: string | null;
      last_name: string | null;
      initials: string | null;
    }[]
  > {
    const data = await hasuraQuery<{
      users: {
        id: number;
        email: string;
        first_name: string | null;
        last_name: string | null;
        initials: string | null;
        role_id: string | null;
        role: string | null;
      }[];
    }>(
      `
      query GetSellerManagers {
        users {
          id
          email
          first_name
          last_name
          initials
          role_id
          role
        }
      }
    `
    );

    return data.users.filter(
      (u) =>
        u.role_id === this.SELLER_MANAGER_ROLE_ID ||
        u.role?.toUpperCase() === "MANAGER" ||
        u.role?.toUpperCase() === "SELLER_MANAGER"
    );
  }

  // ── Create metric object ───────────────────────────────────────────────────
  private static createMetric(
    actual: number,
    target: number | null,
    totalForConversion?: number
  ): PerformanceGoalMetric {
    const safeTarget = target || 0;
    const percentage = safeTarget > 0 ? (actual / safeTarget) * 100 : 0;
    const conversionRate =
      totalForConversion && totalForConversion > 0
        ? (actual / totalForConversion) * 100
        : undefined;

    return {
      actual,
      target: safeTarget,
      percentage: parseFloat(percentage.toFixed(1)),
      conversionRate: conversionRate
        ? parseFloat(conversionRate.toFixed(1))
        : undefined,
    };
  }

  // ── Main: Get Performance Goals for All Managers ───────────────────────────
  static async getPerformanceGoals(
    timeframe: Timeframe
  ): Promise<{
    teamGoals: TeamPerformanceGoals;
    managerGoals: SellerManagerGoals[];
  }> {
    const range = this.getDateRange(timeframe);

    // Fetch data in parallel
    const [zohoGoals, sellerManagers] = await Promise.all([
      this.fetchZohoPerformanceGoals(),
      this.getSellerManagers(),
    ]);

    // Filter goals by date range
    const filteredGoals = this.filterGoalsByDateRange(zohoGoals, range);

    console.log(
      `[PerformanceGoals] Found ${filteredGoals.length} goals for timeframe ${timeframe}`
    );

    // Build email → goal mapping (take the most recent goal if multiple)
    const goalsByEmail = new Map<string, ZohoPerformanceGoal>();
    for (const goal of filteredGoals) {
      const email = goal.Owner?.email?.toLowerCase();
      if (!email) continue;

      const existing = goalsByEmail.get(email);
      if (!existing) {
        goalsByEmail.set(email, goal);
      } else {
        // Keep the one with the later end date
        const existingEnd = existing.End_Date
          ? parseISO(existing.End_Date)
          : new Date(0);
        const newEnd = goal.End_Date ? parseISO(goal.End_Date) : new Date(0);
        if (newEnd > existingEnd) {
          goalsByEmail.set(email, goal);
        }
      }
    }

    // Get user IDs for managers that have goals
    const userIds = sellerManagers.map((u) => u.id);

    // Fetch actual metrics
    const metrics = await this.fetchActualMetrics(range, userIds);

    // Build manager goals
    const managerGoals: SellerManagerGoals[] = [];
    let teamTotals = {
      bookings: { actual: 0, target: 0 },
      offersPresented: { actual: 0, target: 0 },
      offersAccepted: { actual: 0, target: 0 },
      psasExecuted: { actual: 0, target: 0 },
      leadsConverted: { actual: 0, target: 0 },
      revenue: { actual: 0, target: 0 },
      totalLeads: 0,
    };

    for (const manager of sellerManagers) {
      const email = manager.email?.toLowerCase();
      const goal = email ? goalsByEmail.get(email) : undefined;

      const bookingsActual = metrics.bookingsMap.get(manager.id) || 0;
      const offersPresentedActual =
        metrics.offersPresentedMap.get(manager.id) || 0;
      const offersAcceptedActual =
        metrics.offersAcceptedMap.get(manager.id) || 0;
      const psasExecutedActual = metrics.psasExecutedMap.get(manager.id) || 0;
      const leadsConvertedActual =
        metrics.leadsConvertedMap.get(manager.id) || 0;
      const revenueData = metrics.revenueMap.get(manager.id) || {
        total: 0,
        count: 0,
      };
      const totalLeadsActual = metrics.totalLeadsMap.get(manager.id) || 0;
      const avgRevenue =
        revenueData.count > 0 ? revenueData.total / revenueData.count : 0;

      const managerGoal: SellerManagerGoals = {
        userId: manager.id,
        email: manager.email,
        name:
          `${manager.first_name ?? ""} ${manager.last_name ?? ""}`.trim() ||
          manager.email,
        initials:
          manager.initials ??
          `${manager.first_name?.[0] ?? ""}${manager.last_name?.[0] ?? ""}` ||
          "SM",
        goalId: goal?.id ?? null,
        goalName: goal?.Name ?? null,
        startingDate: goal?.Starting_Date ?? null,
        endDate: goal?.End_Date ?? null,
        attendedBookings: this.createMetric(
          bookingsActual,
          goal?.Bookings_Attended_Target ?? null,
          totalLeadsActual
        ),
        offersPresented: this.createMetric(
          offersPresentedActual,
          goal?.Offers_Presented_Target ?? null,
          totalLeadsActual
        ),
        offersAccepted: this.createMetric(
          offersAcceptedActual,
          goal?.Offers_Accepted_Target ?? null,
          totalLeadsActual
        ),
        psasExecuted: this.createMetric(
          psasExecutedActual,
          goal?.PSA_s_Executed_Target ?? null,
          totalLeadsActual
        ),
        leadsConverted: this.createMetric(
          leadsConvertedActual,
          goal?.Converted_Leads_Target ?? null,
          totalLeadsActual
        ),
        avgNetRevenue: this.createMetric(avgRevenue, goal?.Revenue_Target ?? null),
        totalLeads: this.createMetric(
          totalLeadsActual,
          goal?.Total_Leads_Target ?? null
        ),
      };

      managerGoals.push(managerGoal);

      // Accumulate team totals
      teamTotals.bookings.actual += bookingsActual;
      teamTotals.bookings.target += goal?.Bookings_Attended_Target ?? 0;
      teamTotals.offersPresented.actual += offersPresentedActual;
      teamTotals.offersPresented.target += goal?.Offers_Presented_Target ?? 0;
      teamTotals.offersAccepted.actual += offersAcceptedActual;
      teamTotals.offersAccepted.target += goal?.Offers_Accepted_Target ?? 0;
      teamTotals.psasExecuted.actual += psasExecutedActual;
      teamTotals.psasExecuted.target += goal?.PSA_s_Executed_Target ?? 0;
      teamTotals.leadsConverted.actual += leadsConvertedActual;
      teamTotals.leadsConverted.target += goal?.Converted_Leads_Target ?? 0;
      teamTotals.revenue.actual += avgRevenue;
      teamTotals.revenue.target += goal?.Revenue_Target ?? 0;
      teamTotals.totalLeads += totalLeadsActual;
    }

    // Calculate team goals
    const teamGoals: TeamPerformanceGoals = {
      attendedBookings: this.createMetric(
        teamTotals.bookings.actual,
        teamTotals.bookings.target,
        teamTotals.totalLeads
      ),
      offersPresented: this.createMetric(
        teamTotals.offersPresented.actual,
        teamTotals.offersPresented.target,
        teamTotals.totalLeads
      ),
      offersAccepted: this.createMetric(
        teamTotals.offersAccepted.actual,
        teamTotals.offersAccepted.target,
        teamTotals.totalLeads
      ),
      psasExecuted: this.createMetric(
        teamTotals.psasExecuted.actual,
        teamTotals.psasExecuted.target,
        teamTotals.totalLeads
      ),
      leadsConverted: this.createMetric(
        teamTotals.leadsConverted.actual,
        teamTotals.leadsConverted.target,
        teamTotals.totalLeads
      ),
      avgNetRevenue: this.createMetric(
        managerGoals.length > 0
          ? teamTotals.revenue.actual / managerGoals.length
          : 0,
        managerGoals.length > 0
          ? teamTotals.revenue.target / managerGoals.length
          : 0
      ),
    };

    return { teamGoals, managerGoals };
  }

  // ── Get Performance Goals for a specific manager by email ──────────────────
  static async getPerformanceGoalsByEmail(
    email: string,
    timeframe: Timeframe
  ): Promise<SellerManagerGoals | null> {
    const result = await this.getPerformanceGoals(timeframe);
    const managerGoal = result.managerGoals.find(
      (m) => m.email.toLowerCase() === email.toLowerCase()
    );
    return managerGoal ?? null;
  }
}
