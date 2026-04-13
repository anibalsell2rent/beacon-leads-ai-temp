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
  fetchSellerManagers,
  SellerManager,
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
  firstCallSmsAttempts: GoalMetric;
  newSellersContacted: GoalMetric;
  followUpsAttempted: GoalMetric;
  followUpsConnected: GoalMetric;
  offersPresented: GoalMetric;
  offersAccepted: GoalMetric;
  psasExecuted: GoalMetric;
  leadsConverted: GoalMetric;
}

export interface TeamPerformanceGoals {
  attendedBookings: GoalMetric;
  offersPresented: GoalMetric;
  offersAccepted: GoalMetric;
  psasExecuted: GoalMetric;
  leadsConverted: GoalMetric;
  avgNetRevenue: GoalMetric;
  totalLeads: GoalMetric;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const TOTAL_LEADS_TARGET = 1700;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function buildManagerGoal(
  manager: SellerManager,
  goal: ZohoPerformanceGoal | undefined,
  actuals: ManagerActuals,
  totalLeads: number
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
    firstCallSmsAttempts: createMetric(0, 0),
    newSellersContacted: createMetric(0, 0),
    followUpsAttempted: createMetric(0, 0),
    followUpsConnected: createMetric(0, 0),
    offersPresented: createMetric(actuals.offersPresented, goal?.Offers_Presented_Target ?? null, totalLeads),
    offersAccepted: createMetric(actuals.offersAccepted, goal?.Offers_Accepted_Target ?? null, totalLeads),
    psasExecuted: createMetric(actuals.psasExecuted, goal?.PSA_s_Executed_Target ?? null, totalLeads),
    leadsConverted: createMetric(actuals.convertedLeads, goal?.Converted_Leads_Target ?? null, totalLeads),
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
      fetchSellerManagers(),
    ]);

    const filteredGoals = filterGoalsByDateRange(zohoGoals, range);
    const goalsByEmail = buildGoalsByEmail(filteredGoals);

    // Fetch actuals from Zoho COQL for all managers
    const managerEmails = sellerManagers.map((m) => m.email).filter(Boolean);
    const { managerActuals, totalLeads } = await fetchAllManagersActualsFromZoho(managerEmails, range);

    const managerGoals: SellerManagerGoals[] = [];
    const totals = {
      offersPresented: 0,
      offersAccepted: 0,
      psasExecuted: 0,
      leadsConverted: 0,
      targets: {
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
      const actuals = managerActuals.get(email) ?? {
        attendedBookings: 0,
        offersPresented: 0,
        offersAccepted: 0,
        psasExecuted: 0,
        convertedLeads: 0,
      };

      managerGoals.push(buildManagerGoal(manager, goal, actuals, totalLeads));

      totals.offersPresented += actuals.offersPresented;
      totals.offersAccepted += actuals.offersAccepted;
      totals.psasExecuted += actuals.psasExecuted;
      totals.leadsConverted += actuals.convertedLeads;
      totals.targets.offersPresented += goal?.Offers_Presented_Target ?? 0;
      totals.targets.offersAccepted += goal?.Offers_Accepted_Target ?? 0;
      totals.targets.psasExecuted += goal?.PSA_s_Executed_Target ?? 0;
      totals.targets.leadsConverted += goal?.Converted_Leads_Target ?? 0;
      totals.targets.revenue += goal?.Revenue_Target ?? 0;
    }

    const teamGoals: TeamPerformanceGoals = {
      attendedBookings: createMetric(0, 0),
      offersPresented: createMetric(totals.offersPresented, totals.targets.offersPresented, totalLeads),
      offersAccepted: createMetric(totals.offersAccepted, totals.targets.offersAccepted, totalLeads),
      psasExecuted: createMetric(totals.psasExecuted, totals.targets.psasExecuted, totalLeads),
      leadsConverted: createMetric(totals.leadsConverted, totals.targets.leadsConverted, totalLeads),
      avgNetRevenue: createMetric(0, totals.targets.revenue),
      totalLeads: createMetric(totalLeads, TOTAL_LEADS_TARGET),
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

  static async getLeadsCount(timeframe: Timeframe): Promise<number> {
    const range = getDateRange(timeframe);
    const { totalLeads } = await fetchAllManagersActualsFromZoho([], range);
    return totalLeads;
  }
}
