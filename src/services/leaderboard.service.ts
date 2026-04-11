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

interface DateRange {
  start: Date;
  end: Date;
}

interface LeaderboardMetric {
  actual: number;
  target: number;
  percentage: number;
}

// ─── Zoho Types ────────────────────────────────────────────────────────────────

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
  First_Call_SMS_Attempts_Target: number | null;
  New_Sellers_Contacted_Target: number | null;
  Follow_Ups_Attempted_Target: number | null;
  Follow_Ups_Connected_Target: number | null;
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

// ─── Zoho Token Helper ─────────────────────────────────────────────────────────

const zohoToken = async (): Promise<{ data: string | null }> => {
  try {
    const request = await axios.get(
      "https://zohotoken-663034886613.us-central1.run.app/api/zoho/token"
    );
    const token = (request.data as { token?: string }).token;
    return { data: token ?? null };
  } catch (error) {
    console.error("[Leaderboard] Error fetching Zoho token:", error);
    return { data: null };
  }
};

export class LeaderboardService {
  private static SELLER_MANAGER_ROLE_ID = "07ed4242-3905-4136-b225-4f9b3a6137af";
  private static SELLER_ADVISOR_ROLE_ID = "89370776-e910-410a-8656-628f8691501d";
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
        console.error("[Leaderboard] No Zoho token available");
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
        "First_Call_SMS_Attempts_Target",
        "New_Sellers_Contacted_Target",
        "Follow_Ups_Attempted_Target",
        "Follow_Ups_Connected_Target",
      ].join(",");

      const url = `https://www.zohoapis.com/crm/v3/Performance_Goals?fields=${fields}`;

      const response = await axios.get<ZohoResponse>(url, {
        headers: {
          Authorization: `Zoho-oauthtoken ${token.data}`,
        },
      });

      if (!response.data?.data) {
        console.warn("[Leaderboard] No data returned from Zoho");
        return [];
      }

      return response.data.data;
    } catch (error: any) {
      console.error(
        "[Leaderboard] Error fetching from Zoho:",
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

  // ── Create metric object ───────────────────────────────────────────────────
  private static createMetric(
    actual: number,
    target: number | null
  ): LeaderboardMetric {
    const safeTarget = target || 0;
    const percentage = safeTarget > 0 ? (actual / safeTarget) * 100 : 0;
    return {
      actual,
      target: safeTarget,
      percentage: parseFloat(percentage.toFixed(1)),
    };
  }

  // ── Main ───────────────────────────────────────────────────────────────────
  static async getLeaderboard(timeframe: Timeframe) {
    const range = this.getDateRange(timeframe);
    const start = range.start.toISOString();
    const end = range.end.toISOString();

    // crm_leads dates  → timestamptz
    // crm_activities.created_at → timestamp
    // crm_deals dates  → date
    const dateStart = start.split("T")[0];
    const dateEnd = end.split("T")[0];

    // Fetch Zoho goals in parallel with DB data
    const [zohoGoals, data] = await Promise.all([
      this.fetchZohoPerformanceGoals(),
      hasuraQuery<{
        users: {
          id: number;
          email: string | null;
          first_name: string | null;
          last_name: string | null;
          role: string | null;
          role_id: string | null;
          initials: string | null;
        }[];
        crm_activities: {
          created_by: number | null;
          activity_type_id: number | null;
          created_at: string;
        }[];
        bookingLeads: {
          seller_advisor_id: number | null;
          scheduled_booking_date: string | null;
        }[];
        convertedLeads: {
          seller_advisor_id: number | null;
          seller_manager_id: number | null;
          date_created: string | null;
        }[];
        managerLeads: {
          id: string;
          seller_manager_id: number | null;
        }[];
        totalLeadsInPeriod: {
          id: string;
          seller_manager_id: number | null;
        }[];
        crm_deals: {
          lead_id: string | null;
          offer_presented_date: string | null;
          offer_accepted_date: string | null;
          psa_execution_date: string | null;
        }[];
      }>(
        `
        query LeaderboardData(
          $tsStart:   timestamp!
          $tsEnd:     timestamp!
          $tsStartTz: timestamptz!
          $tsEndTz:   timestamptz!
          $dateStart: date!
          $dateEnd:   date!
        ) {
          users {
            id email first_name last_name role role_id initials
          }

          crm_activities(
            where: { created_at: { _gte: $tsStart, _lte: $tsEnd } }
          ) {
            created_by activity_type_id created_at
          }

          bookingLeads: crm_leads(
            where: { scheduled_booking_date: { _gte: $tsStartTz, _lte: $tsEndTz } }
          ) {
            seller_advisor_id scheduled_booking_date
          }

          convertedLeads: crm_leads(
            where: {
              result: { _eq: "Converted" }
              date_created: { _gte: $tsStartTz, _lte: $tsEndTz }
            }
          ) {
            seller_advisor_id seller_manager_id date_created
          }

          managerLeads: crm_leads {
            id seller_manager_id
          }

          totalLeadsInPeriod: crm_leads(
            where: { date_created: { _gte: $tsStartTz, _lte: $tsEndTz } }
          ) {
            id seller_manager_id
          }

          crm_deals(
            where: {
              _or: [
                { offer_presented_date: { _gte: $dateStart, _lte: $dateEnd } }
                { offer_accepted_date:  { _gte: $dateStart, _lte: $dateEnd } }
                { psa_execution_date:   { _gte: $dateStart, _lte: $dateEnd } }
              ]
            }
          ) {
            lead_id offer_presented_date offer_accepted_date psa_execution_date
          }
        }
      `,
        {
          tsStart: start,
          tsEnd: end,
          tsStartTz: start,
          tsEndTz: end,
          dateStart,
          dateEnd,
        }
      ),
    ]);

    // Filter Zoho goals by date range
    const filteredGoals = this.filterGoalsByDateRange(zohoGoals, range);

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

    console.log(
      `[Leaderboard] Found ${filteredGoals.length} goals for timeframe ${timeframe}`
    );

    const allUsers = data.users;

    const advisors = allUsers.filter(
      (u) =>
        u.role_id === this.SELLER_ADVISOR_ROLE_ID ||
        u.role?.toUpperCase() === "ADVISOR" ||
        u.role?.toUpperCase() === "SELLER_ADVISOR"
    );
    const managers = allUsers.filter(
      (u) =>
        u.role_id === this.SELLER_MANAGER_ROLE_ID ||
        u.role?.toUpperCase() === "MANAGER" ||
        u.role?.toUpperCase() === "SELLER_MANAGER"
    );

    console.log(`[Leaderboard Audit] Raw Users Found: ${allUsers.length}`);
    const sample =
      allUsers.find(
        (u) => u.first_name === "Santiago" && u.last_name === "Rodriguez"
      ) ?? allUsers[0];
    if (sample) {
      console.log(
        `[Leaderboard Debug] Sample User (${sample.first_name}): id=${sample.id}`
      );
    }
    console.log(
      `[Leaderboard] Processed ${managers.length} managers and ${advisors.length} advisors`
    );

    // 2. Build in-memory lookup structures from the batch data
    // seller_manager_id in crm_leads is Int (FK → users.id)
    const managerLeadMap = new Map<number, Set<string>>(); // managerId(Int) → Set<leadId>
    for (const lead of data.managerLeads) {
      if (!lead.seller_manager_id) continue;
      const mgr = Number(lead.seller_manager_id);
      if (!managerLeadMap.has(mgr)) managerLeadMap.set(mgr, new Set());
      managerLeadMap.get(mgr)!.add(String(lead.id));
    }

    // Count total leads per manager in the period
    const totalLeadsPerManager = new Map<number, number>();
    for (const lead of data.totalLeadsInPeriod) {
      if (!lead.seller_manager_id) continue;
      const mgr = Number(lead.seller_manager_id);
      totalLeadsPerManager.set(mgr, (totalLeadsPerManager.get(mgr) || 0) + 1);
    }

    // 3. Build seller advisor entries
    // users.id is Int; crm_activities.created_by is Int (same FK)
    const sellerAdvisors = advisors.map((emp) => {
      const userId = Number(emp.id); // users.id is Int
      const internalId = emp.id;

      const callsConnected = data.crm_activities.filter(
        (a) =>
          a.activity_type_id === this.ACTIVITY_TYPE_CALL &&
          Number(a.created_by) === userId
      ).length;

      const smsSent = data.crm_activities.filter(
        (a) =>
          a.activity_type_id === this.ACTIVITY_TYPE_SMS &&
          Number(a.created_by) === userId
      ).length;

      const bookings = data.bookingLeads.filter(
        (l) => Number(l.seller_advisor_id) === userId
      ).length;

      const leadsConverted = data.convertedLeads.filter(
        (l) => Number(l.seller_advisor_id) === userId
      ).length;

      const conversionPercentage = parseFloat(
        ((leadsConverted / (bookings || 1)) * 100).toFixed(2)
      );

      return {
        employeeId: internalId,
        initials:
          emp.initials ??
          `${emp.first_name?.[0] ?? ""}${emp.last_name?.[0] ?? ""}` ||
          "SA",
        name: `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim(),
        callsConnected,
        smsSent,
        bookings,
        monthlyGoal: 20,
        leadsConverted,
        conversionPercentage,
      };
    });

    // 4. Build seller manager entries with Zoho goals
    const sellerManagers = managers.map((emp) => {
      const userId = Number(emp.id);
      const internalId = emp.id;
      const email = emp.email?.toLowerCase() || "";

      // Get Zoho goal for this manager
      const goal = goalsByEmail.get(email);

      const callsConnected = data.crm_activities.filter(
        (a) =>
          a.activity_type_id === this.ACTIVITY_TYPE_CALL &&
          Number(a.created_by) === userId
      ).length;

      const smsSent = data.crm_activities.filter(
        (a) =>
          a.activity_type_id === this.ACTIVITY_TYPE_SMS &&
          Number(a.created_by) === userId
      ).length;

      // First Call/SMS Attempts = calls + sms
      const firstCallSmsAttempts = callsConnected + smsSent;

      const mgrLeadIds = managerLeadMap.get(userId) ?? new Set<string>();
      const totalLeads = totalLeadsPerManager.get(userId) || 0;

      const offersPresented = data.crm_deals.filter(
        (d) =>
          d.lead_id &&
          mgrLeadIds.has(String(d.lead_id)) &&
          d.offer_presented_date
      ).length;

      const offersAccepted = data.crm_deals.filter(
        (d) =>
          d.lead_id &&
          mgrLeadIds.has(String(d.lead_id)) &&
          d.offer_accepted_date
      ).length;

      const psasExecuted = data.crm_deals.filter(
        (d) =>
          d.lead_id && mgrLeadIds.has(String(d.lead_id)) && d.psa_execution_date
      ).length;

      const leadsConverted = data.convertedLeads.filter(
        (l) => Number(l.seller_manager_id) === userId
      ).length;

      const conversionPercentage = parseFloat(
        ((leadsConverted / (offersPresented || 1)) * 100).toFixed(2)
      );

      // TODO: These need actual data sources when available
      const newSellersContacted = 0;
      const followUpsAttempted = 0;
      const followUpsConnected = 0;

      return {
        employeeId: internalId,
        email: emp.email,
        initials:
          emp.initials ??
          `${emp.first_name?.[0] ?? ""}${emp.last_name?.[0] ?? ""}` ||
          "SM",
        name: `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim(),
        callsConnected,
        smsSent,
        firstCallSmsAttempts: this.createMetric(
          firstCallSmsAttempts,
          goal?.First_Call_SMS_Attempts_Target ?? 30
        ),
        newSellersContacted: this.createMetric(
          newSellersContacted,
          goal?.New_Sellers_Contacted_Target ?? 20
        ),
        followUpsAttempted: this.createMetric(
          followUpsAttempted,
          goal?.Follow_Ups_Attempted_Target ?? 50
        ),
        followUpsConnected: this.createMetric(
          followUpsConnected,
          goal?.Follow_Ups_Connected_Target ?? 25
        ),
        offersPresented: this.createMetric(
          offersPresented,
          goal?.Offers_Presented_Target ?? 60
        ),
        offersAccepted: this.createMetric(
          offersAccepted,
          goal?.Offers_Accepted_Target ?? 30
        ),
        psasExecuted: this.createMetric(
          psasExecuted,
          goal?.PSA_s_Executed_Target ?? 20
        ),
        leadsConverted: this.createMetric(
          leadsConverted,
          goal?.Converted_Leads_Target ?? 15
        ),
        totalLeads,
        monthlyOffersGoal: goal?.Offers_Presented_Target ?? 60,
        conversionPercentage,
      };
    });

    return { sellerAdvisors, sellerManagers };
  }
}
