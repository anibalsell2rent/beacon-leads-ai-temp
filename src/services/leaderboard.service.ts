import { hasuraQuery } from "../utils/hasura.client";
import { Timeframe } from "./teamPerformance.service";
import {
  getDateRange,
  fetchZohoPerformanceGoals,
  filterGoalsByDateRange,
  buildGoalsByEmail,
  createMetric,
  fetchAllManagersActualsFromZoho,
  SELLER_MANAGER_ROLE_ID,
  SELLER_ADVISOR_ROLE_ID,
} from "../utils/zoho-goals.utils";
const ACTIVITY_TYPE_CALL = 1;
const ACTIVITY_TYPE_SMS = 2;

const LEADERBOARD_QUERY = `
  query LeaderboardData($tsStart: timestamp!, $tsEnd: timestamp!, $tsStartTz: timestamptz!, $tsEndTz: timestamptz!, $managerRoleId: uuid!, $advisorRoleId: uuid!) {
    sellerManagers: users(where: { role_id: { _eq: $managerRoleId }, is_active: { _eq: true } }) {
      id email first_name last_name initials
    }
    sellerAdvisors: users(where: { role_id: { _eq: $advisorRoleId }, is_active: { _eq: true } }) {
      id email first_name last_name initials
    }
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

interface UserData {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  initials: string | null;
}

interface LeaderboardData {
  sellerManagers: UserData[];
  sellerAdvisors: UserData[];
  crm_activities: { created_by: number | null; activity_type_id: number | null }[];
  bookingLeads: { seller_advisor_id: number | null }[];
  convertedLeads: { seller_advisor_id: number | null }[];
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
        managerRoleId: SELLER_MANAGER_ROLE_ID,
        advisorRoleId: SELLER_ADVISOR_ROLE_ID,
      }),
    ]);

    const filteredGoals = filterGoalsByDateRange(zohoGoals, range);
    const goalsByEmail = buildGoalsByEmail(filteredGoals);

    // Fetch actuals from Zoho COQL for all managers
    const managerEmails = data.sellerManagers.map((m) => m.email).filter(Boolean) as string[];
    const { managerActuals, totalLeads } = await fetchAllManagersActualsFromZoho(managerEmails, range);

    const sellerAdvisors = data.sellerAdvisors.map((emp) => {
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

    const sellerManagers = data.sellerManagers.map((emp) => {
      const email = emp.email?.toLowerCase() || "";
      const goal = goalsByEmail.get(email);
      const actuals = managerActuals.get(email) ?? {
        attendedBookings: 0,
        offersPresented: 0,
        offersAccepted: 0,
        psasExecuted: 0,
        convertedLeads: 0,
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
        offersPresented: createMetric(actuals.offersPresented, goal?.Offers_Presented_Target ?? 60, totalLeads),
        offersAccepted: createMetric(actuals.offersAccepted, goal?.Offers_Accepted_Target ?? 30, totalLeads),
        psasExecuted: createMetric(actuals.psasExecuted, goal?.PSA_s_Executed_Target ?? 20, totalLeads),
        leadsConverted: createMetric(actuals.convertedLeads, goal?.Converted_Leads_Target ?? 15, totalLeads),
        totalLeads,
        monthlyOffersGoal: goal?.Offers_Presented_Target ?? 60,
        conversionPercentage: parseFloat(
          ((actuals.convertedLeads / (actuals.offersPresented || 1)) * 100).toFixed(2)
        ),
      };
    });

    return { sellerAdvisors, sellerManagers };
  }
}
