import { hasuraQuery } from "../utils/hasura.client";
import { Timeframe } from "./teamPerformance.service";
import {
  GoalMetric,
  ZohoPerformanceGoal,
  getDateRange,
  fetchZohoPerformanceGoals,
  filterGoalsByDateRange,
  buildGoalsByEmail,
  createMetric,
  fetchAllManagersActualsFromZoho,
  ManagerActuals,
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

// ─── Helpers ───────────────────────────────────────────────────────────────────

interface SellerManager {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  initials: string | null;
}

async function getSellerManagers(): Promise<SellerManager[]> {
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
  }>(`query GetSellerManagers { users { id email first_name last_name initials role_id role } }`);

  return data.users.filter(
    (u) =>
      u.role_id === SELLER_MANAGER_ROLE_ID ||
      u.role?.toUpperCase() === "MANAGER" ||
      u.role?.toUpperCase() === "SELLER_MANAGER"
  );
}

function buildManagerGoal(
  manager: SellerManager,
  goal: ZohoPerformanceGoal | undefined,
  actuals: ManagerActuals
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
    attendedBookings: createMetric(actuals.attendedBookings, goal?.Bookings_Attended_Target ?? null, actuals.totalLeads),
    offersPresented: createMetric(actuals.offersPresented, goal?.Offers_Presented_Target ?? null, actuals.totalLeads),
    offersAccepted: createMetric(actuals.offersAccepted, goal?.Offers_Accepted_Target ?? null, actuals.totalLeads),
    psasExecuted: createMetric(actuals.psasExecuted, goal?.PSA_s_Executed_Target ?? null, actuals.totalLeads),
    leadsConverted: createMetric(actuals.convertedLeads, goal?.Converted_Leads_Target ?? null, actuals.totalLeads),
    avgNetRevenue: createMetric(0, goal?.Revenue_Target ?? null), // Revenue comes from deals, will fetch separately if needed
    totalLeads: createMetric(actuals.totalLeads, goal?.Total_Leads_Target ?? null),
  };
}

// ─── Service ───────────────────────────────────────────────────────────────────

export class PerformanceGoalsService {
  static async getPerformanceGoals(
    timeframe: Timeframe
  ): Promise<{ teamGoals: TeamPerformanceGoals; managerGoals: SellerManagerGoals[] }> {
    const range = getDateRange(timeframe);

    const [zohoGoals, sellerManagers] = await Promise.all([
      fetchZohoPerformanceGoals(),
      getSellerManagers(),
    ]);

    const filteredGoals = filterGoalsByDateRange(zohoGoals, range);
    const goalsByEmail = buildGoalsByEmail(filteredGoals);

    // Fetch actuals from Zoho COQL for all managers
    const managerEmails = sellerManagers.map((m) => m.email).filter(Boolean);
    const actualsMap = await fetchAllManagersActualsFromZoho(managerEmails, range);

    const managerGoals: SellerManagerGoals[] = [];
    const totals = {
      bookings: 0,
      offersPresented: 0,
      offersAccepted: 0,
      psasExecuted: 0,
      leadsConverted: 0,
      totalLeads: 0,
      targets: {
        bookings: 0,
        offersPresented: 0,
        offersAccepted: 0,
        psasExecuted: 0,
        leadsConverted: 0,
        revenue: 0,
      },
    };

    for (const manager of sellerManagers) {
      const email = manager.email?.toLowerCase();
      const goal = email ? goalsByEmail.get(email) : undefined;
      const actuals = actualsMap.get(email) ?? {
        attendedBookings: 0,
        offersPresented: 0,
        offersAccepted: 0,
        psasExecuted: 0,
        convertedLeads: 0,
        totalLeads: 0,
      };

      managerGoals.push(buildManagerGoal(manager, goal, actuals));

      totals.bookings += actuals.attendedBookings;
      totals.offersPresented += actuals.offersPresented;
      totals.offersAccepted += actuals.offersAccepted;
      totals.psasExecuted += actuals.psasExecuted;
      totals.leadsConverted += actuals.convertedLeads;
      totals.totalLeads += actuals.totalLeads;
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
      avgNetRevenue: createMetric(0, totals.targets.revenue),
    };

    return { teamGoals, managerGoals };
  }

  static async getPerformanceGoalsByEmail(
    email: string,
    timeframe: Timeframe
  ): Promise<SellerManagerGoals | null> {
    const result = await this.getPerformanceGoals(timeframe);
    return result.managerGoals.find((m) => m.email.toLowerCase() === email.toLowerCase()) ?? null;
  }
}
