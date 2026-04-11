import { hasuraQuery } from "../utils/hasura.client";
import { Timeframe } from "./teamPerformance.service";
import {
  getDateRange,
  fetchZohoPerformanceGoals,
  filterGoalsByDateRange,
  buildGoalsByEmail,
  createMetric,
} from "../utils/zoho-goals.utils";

const SELLER_MANAGER_ROLE_ID = "07ed4242-3905-4136-b225-4f9b3a6137af";
const SELLER_ADVISOR_ROLE_ID = "89370776-e910-410a-8656-628f8691501d";
const ACTIVITY_TYPE_CALL = 1;
const ACTIVITY_TYPE_SMS = 2;

const LEADERBOARD_QUERY = `
  query LeaderboardData(
    $tsStart: timestamp!, $tsEnd: timestamp!,
    $tsStartTz: timestamptz!, $tsEndTz: timestamptz!,
    $dateStart: date!, $dateEnd: date!
  ) {
    users { id email first_name last_name role role_id initials }
    crm_activities(where: { created_at: { _gte: $tsStart, _lte: $tsEnd } }) {
      created_by activity_type_id
    }
    bookingLeads: crm_leads(where: { scheduled_booking_date: { _gte: $tsStartTz, _lte: $tsEndTz } }) {
      seller_advisor_id
    }
    convertedLeads: crm_leads(where: { result: { _eq: "Converted" }, date_created: { _gte: $tsStartTz, _lte: $tsEndTz } }) {
      seller_advisor_id seller_manager_id
    }
    managerLeads: crm_leads { id seller_manager_id }
    totalLeadsInPeriod: crm_leads(where: { date_created: { _gte: $tsStartTz, _lte: $tsEndTz } }) {
      id seller_manager_id
    }
    crm_deals(where: { _or: [
      { offer_presented_date: { _gte: $dateStart, _lte: $dateEnd } },
      { offer_accepted_date: { _gte: $dateStart, _lte: $dateEnd } },
      { psa_execution_date: { _gte: $dateStart, _lte: $dateEnd } }
    ]}) {
      lead_id offer_presented_date offer_accepted_date psa_execution_date
    }
  }
`;

interface LeaderboardData {
  users: { id: number; email: string | null; first_name: string | null; last_name: string | null; role: string | null; role_id: string | null; initials: string | null }[];
  crm_activities: { created_by: number | null; activity_type_id: number | null }[];
  bookingLeads: { seller_advisor_id: number | null }[];
  convertedLeads: { seller_advisor_id: number | null; seller_manager_id: number | null }[];
  managerLeads: { id: string; seller_manager_id: number | null }[];
  totalLeadsInPeriod: { id: string; seller_manager_id: number | null }[];
  crm_deals: { lead_id: string | null; offer_presented_date: string | null; offer_accepted_date: string | null; psa_execution_date: string | null }[];
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

function isRoleMatch(user: { role_id: string | null; role: string | null }, roleId: string, ...names: string[]): boolean {
  if (user.role_id === roleId) return true;
  const r = user.role?.toUpperCase();
  return names.some((n) => r === n);
}

export class LeaderboardService {
  static async getLeaderboard(timeframe: Timeframe) {
    const range = getDateRange(timeframe);
    const start = range.start.toISOString();
    const end = range.end.toISOString();
    const dateStart = start.split("T")[0];
    const dateEnd = end.split("T")[0];

    const [zohoGoals, data] = await Promise.all([
      fetchZohoPerformanceGoals(),
      hasuraQuery<LeaderboardData>(LEADERBOARD_QUERY, { tsStart: start, tsEnd: end, tsStartTz: start, tsEndTz: end, dateStart, dateEnd }),
    ]);

    const filteredGoals = filterGoalsByDateRange(zohoGoals, range);
    const goalsByEmail = buildGoalsByEmail(filteredGoals);

    const advisors = data.users.filter((u) => isRoleMatch(u, SELLER_ADVISOR_ROLE_ID, "ADVISOR", "SELLER_ADVISOR"));
    const managers = data.users.filter((u) => isRoleMatch(u, SELLER_MANAGER_ROLE_ID, "MANAGER", "SELLER_MANAGER"));

    const managerLeadMap = buildManagerLeadMap(data.managerLeads);
    const totalLeadsPerManager = countByManager(data.totalLeadsInPeriod);

    const sellerAdvisors = advisors.map((emp) => {
      const userId = Number(emp.id);
      const callsConnected = data.crm_activities.filter((a) => a.activity_type_id === ACTIVITY_TYPE_CALL && Number(a.created_by) === userId).length;
      const smsSent = data.crm_activities.filter((a) => a.activity_type_id === ACTIVITY_TYPE_SMS && Number(a.created_by) === userId).length;
      const bookings = data.bookingLeads.filter((l) => Number(l.seller_advisor_id) === userId).length;
      const leadsConverted = data.convertedLeads.filter((l) => Number(l.seller_advisor_id) === userId).length;

      return {
        employeeId: emp.id,
        initials: emp.initials ?? (`${emp.first_name?.[0] ?? ""}${emp.last_name?.[0] ?? ""}` || "SA"),
        name: `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim(),
        callsConnected,
        smsSent,
        bookings,
        monthlyGoal: 20,
        leadsConverted,
        conversionPercentage: parseFloat(((leadsConverted / (bookings || 1)) * 100).toFixed(2)),
      };
    });

    const sellerManagers = managers.map((emp) => {
      const userId = Number(emp.id);
      const email = emp.email?.toLowerCase() || "";
      const goal = goalsByEmail.get(email);
      const mgrLeadIds = managerLeadMap.get(userId) ?? new Set<string>();

      const callsConnected = data.crm_activities.filter((a) => a.activity_type_id === ACTIVITY_TYPE_CALL && Number(a.created_by) === userId).length;
      const smsSent = data.crm_activities.filter((a) => a.activity_type_id === ACTIVITY_TYPE_SMS && Number(a.created_by) === userId).length;
      const offersPresented = data.crm_deals.filter((d) => d.lead_id && mgrLeadIds.has(String(d.lead_id)) && d.offer_presented_date).length;
      const offersAccepted = data.crm_deals.filter((d) => d.lead_id && mgrLeadIds.has(String(d.lead_id)) && d.offer_accepted_date).length;
      const psasExecuted = data.crm_deals.filter((d) => d.lead_id && mgrLeadIds.has(String(d.lead_id)) && d.psa_execution_date).length;
      const leadsConverted = data.convertedLeads.filter((l) => Number(l.seller_manager_id) === userId).length;
      const totalLeads = totalLeadsPerManager.get(userId) || 0;

      return {
        employeeId: emp.id,
        email: emp.email,
        initials: emp.initials ?? (`${emp.first_name?.[0] ?? ""}${emp.last_name?.[0] ?? ""}` || "SM"),
        name: `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim(),
        callsConnected,
        smsSent,
        firstCallSmsAttempts: createMetric(callsConnected + smsSent, goal?.First_Call_SMS_Attempts_Target ?? 30),
        newSellersContacted: createMetric(0, goal?.New_Sellers_Contacted_Target ?? 20),
        followUpsAttempted: createMetric(0, goal?.Follow_Ups_Attempted_Target ?? 50),
        followUpsConnected: createMetric(0, goal?.Follow_Ups_Connected_Target ?? 25),
        offersPresented: createMetric(offersPresented, goal?.Offers_Presented_Target ?? 60),
        offersAccepted: createMetric(offersAccepted, goal?.Offers_Accepted_Target ?? 30),
        psasExecuted: createMetric(psasExecuted, goal?.PSA_s_Executed_Target ?? 20),
        leadsConverted: createMetric(leadsConverted, goal?.Converted_Leads_Target ?? 15),
        totalLeads,
        monthlyOffersGoal: goal?.Offers_Presented_Target ?? 60,
        conversionPercentage: parseFloat(((leadsConverted / (offersPresented || 1)) * 100).toFixed(2)),
      };
    });

    return { sellerAdvisors, sellerManagers };
  }
}
