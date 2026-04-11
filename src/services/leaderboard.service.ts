import { hasuraQuery } from "../utils/hasura.client";
import { Timeframe } from "./teamPerformance.service";
import {
  getDateRange,
  fetchZohoPerformanceGoals,
  filterGoalsByDateRange,
  buildGoalsByEmail,
  createMetric,
  fetchAllManagersActualsFromZoho,
} from "../utils/zoho-goals.utils";

const SELLER_MANAGER_ROLE_ID = "07ed4242-3905-4136-b225-4f9b3a6137af";
const SELLER_ADVISOR_ROLE_ID = "89370776-e910-410a-8656-628f8691501d";
const ACTIVITY_TYPE_CALL = 1;
const ACTIVITY_TYPE_SMS = 2;

const LEADERBOARD_QUERY = `
  query LeaderboardData($tsStart: timestamp!, $tsEnd: timestamp!, $tsStartTz: timestamptz!, $tsEndTz: timestamptz!) {
    users { id email first_name last_name role role_id initials }
    crm_activities(where: { created_at: { _gte: $tsStart, _lte: $tsEnd } }) {
      created_by activity_type_id
    }
    bookingLeads: crm_leads(where: { scheduled_booking_date: { _gte: $tsStartTz, _lte: $tsEndTz } }) {
      seller_advisor_id
    }
    convertedLeads: crm_leads(where: { result: { _eq: "Converted" }, date_created: { _gte: $tsStartTz, _lte: $tsEndTz } }) {
      seller_advisor_id
    }
  }
`;

interface LeaderboardData {
  users: {
    id: number;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    role: string | null;
    role_id: string | null;
    initials: string | null;
  }[];
  crm_activities: { created_by: number | null; activity_type_id: number | null }[];
  bookingLeads: { seller_advisor_id: number | null }[];
  convertedLeads: { seller_advisor_id: number | null }[];
}

function isRoleMatch(
  user: { role_id: string | null; role: string | null },
  roleId: string,
  ...names: string[]
): boolean {
  if (user.role_id === roleId) return true;
  const r = user.role?.toUpperCase();
  return names.some((n) => r === n);
}

export class LeaderboardService {
  static async getLeaderboard(timeframe: Timeframe) {
    const range = getDateRange(timeframe);
    const start = range.start.toISOString();
    const end = range.end.toISOString();

    const [zohoGoals, data] = await Promise.all([
      fetchZohoPerformanceGoals(),
      hasuraQuery<LeaderboardData>(LEADERBOARD_QUERY, {
        tsStart: start,
        tsEnd: end,
        tsStartTz: start,
        tsEndTz: end,
      }),
    ]);

    const filteredGoals = filterGoalsByDateRange(zohoGoals, range);
    const goalsByEmail = buildGoalsByEmail(filteredGoals);

    const advisors = data.users.filter((u) =>
      isRoleMatch(u, SELLER_ADVISOR_ROLE_ID, "ADVISOR", "SELLER_ADVISOR")
    );
    const managers = data.users.filter((u) =>
      isRoleMatch(u, SELLER_MANAGER_ROLE_ID, "MANAGER", "SELLER_MANAGER")
    );

    // Fetch actuals from Zoho COQL for all managers
    const managerEmails = managers.map((m) => m.email).filter(Boolean) as string[];
    const actualsMap = await fetchAllManagersActualsFromZoho(managerEmails, range);

    const sellerAdvisors = advisors.map((emp) => {
      const userId = Number(emp.id);
      const callsConnected = data.crm_activities.filter(
        (a) => a.activity_type_id === ACTIVITY_TYPE_CALL && Number(a.created_by) === userId
      ).length;
      const smsSent = data.crm_activities.filter(
        (a) => a.activity_type_id === ACTIVITY_TYPE_SMS && Number(a.created_by) === userId
      ).length;
      const bookings = data.bookingLeads.filter((l) => Number(l.seller_advisor_id) === userId).length;
      const leadsConverted = data.convertedLeads.filter(
        (l) => Number(l.seller_advisor_id) === userId
      ).length;

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
      const email = emp.email?.toLowerCase() || "";
      const goal = goalsByEmail.get(email);
      const actuals = actualsMap.get(email) ?? {
        attendedBookings: 0,
        offersPresented: 0,
        offersAccepted: 0,
        psasExecuted: 0,
        convertedLeads: 0,
        totalLeads: 0,
      };

      const userId = Number(emp.id);
      const callsConnected = data.crm_activities.filter(
        (a) => a.activity_type_id === ACTIVITY_TYPE_CALL && Number(a.created_by) === userId
      ).length;
      const smsSent = data.crm_activities.filter(
        (a) => a.activity_type_id === ACTIVITY_TYPE_SMS && Number(a.created_by) === userId
      ).length;

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
        offersPresented: createMetric(actuals.offersPresented, goal?.Offers_Presented_Target ?? 60),
        offersAccepted: createMetric(actuals.offersAccepted, goal?.Offers_Accepted_Target ?? 30),
        psasExecuted: createMetric(actuals.psasExecuted, goal?.PSA_s_Executed_Target ?? 20),
        leadsConverted: createMetric(actuals.convertedLeads, goal?.Converted_Leads_Target ?? 15),
        totalLeads: actuals.totalLeads,
        monthlyOffersGoal: goal?.Offers_Presented_Target ?? 60,
        conversionPercentage: parseFloat(
          ((actuals.convertedLeads / (actuals.offersPresented || 1)) * 100).toFixed(2)
        ),
      };
    });

    return { sellerAdvisors, sellerManagers };
  }
}
