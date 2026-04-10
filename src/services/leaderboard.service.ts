import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
} from "date-fns";
import { hasuraQuery } from "../utils/hasura.client";
import { Timeframe } from "./teamPerformance.service";

interface DateRange {
  start: Date;
  end: Date;
}

export class LeaderboardService {
  private static SELLER_MANAGER_ROLE_ID = "07ed4242-3905-4136-b225-4f9b3a6137af";
  private static SELLER_ADVISOR_ROLE_ID  = "89370776-e910-410a-8656-628f8691501d";
  private static ACTIVITY_TYPE_CALL = 1;
  private static ACTIVITY_TYPE_SMS  = 2;

  // ── Date range helper ──────────────────────────────────────────────────────
  private static getDateRange(timeframe: Timeframe): DateRange {
    const now = new Date();
    switch (timeframe) {
      case "THIS_WEEK":    return { start: startOfWeek(now),    end: endOfWeek(now) };
      case "THIS_MONTH":   return { start: startOfMonth(now),   end: endOfMonth(now) };
      case "THIS_QUARTER": return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case "YEAR_TO_DATE": return { start: startOfYear(now),    end: now };
      default:             return { start: startOfMonth(now),   end: endOfMonth(now) };
    }
  }

  // ── Main ───────────────────────────────────────────────────────────────────
  static async getLeaderboard(timeframe: Timeframe) {
    const range = this.getDateRange(timeframe);
    const start = range.start.toISOString();
    const end   = range.end.toISOString();

    // crm_leads dates  → timestamptz
    // crm_activities.created_at → timestamp
    // crm_deals dates  → date
    const dateStart = start.split("T")[0];
    const dateEnd   = end.split("T")[0];

    // 1. Fetch all users + activities + leads + deals in one batch query
    const data = await hasuraQuery<{
      users: {
        id: number;
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
          id first_name last_name role role_id initials
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
      { tsStart: start, tsEnd: end, tsStartTz: start, tsEndTz: end, dateStart, dateEnd }
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

    // 3. Build seller advisor entries
    // users.id is Int; crm_activities.created_by is Int (same FK)
    const sellerAdvisors = advisors.map((emp) => {
      const userId     = Number(emp.id); // users.id is Int
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
          (emp.initials ?? `${emp.first_name?.[0] ?? ""}${emp.last_name?.[0] ?? ""}`) || "SA",
        name: `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim(),
        callsConnected,
        smsSent,
        bookings,
        monthlyGoal: 20,
        leadsConverted,
        conversionPercentage,
      };
    });

    // 4. Build seller manager entries
    const sellerManagers = managers.map((emp) => {
      const userId     = Number(emp.id);
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

      const mgrLeadIds = managerLeadMap.get(userId) ?? new Set<string>();

      const offersPresented = data.crm_deals.filter(
        (d) => d.lead_id && mgrLeadIds.has(String(d.lead_id)) && d.offer_presented_date
      ).length;

      const offersAccepted = data.crm_deals.filter(
        (d) => d.lead_id && mgrLeadIds.has(String(d.lead_id)) && d.offer_accepted_date
      ).length;

      const psasExecuted = data.crm_deals.filter(
        (d) => d.lead_id && mgrLeadIds.has(String(d.lead_id)) && d.psa_execution_date
      ).length;

      const leadsConverted = data.convertedLeads.filter(
        (l) => Number(l.seller_manager_id) === userId
      ).length;

      const conversionPercentage = parseFloat(
        ((leadsConverted / (offersPresented || 1)) * 100).toFixed(2)
      );

      return {
        employeeId: internalId,
        initials:
          (emp.initials ?? `${emp.first_name?.[0] ?? ""}${emp.last_name?.[0] ?? ""}`) || "SM",
        name: `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim(),
        callsConnected,
        smsSent,
        offersPresented,
        monthlyOffersGoal: 60,
        offersAccepted,
        psasExecuted,
        leadsConverted,
        conversionPercentage,
      };
    });

    return { sellerAdvisors, sellerManagers };
  }
}
