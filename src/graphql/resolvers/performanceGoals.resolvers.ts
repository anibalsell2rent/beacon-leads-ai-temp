import { PerformanceGoalsService } from "../../services/performanceGoals.service";
import { Timeframe } from "../../services/teamPerformance.service";

export const performanceGoalsResolvers = {
  Query: {
    getPerformanceGoals: async (
      _: any,
      { timeframe }: { timeframe: Timeframe }
    ) => {
      try {
        return await PerformanceGoalsService.getPerformanceGoals(timeframe);
      } catch (error: any) {
        console.error("[PerformanceGoals Resolver] Error:", error);
        throw new Error(
          `Failed to fetch performance goals: ${error.message}`
        );
      }
    },

    getPerformanceGoalsByEmail: async (
      _: any,
      { email, timeframe }: { email: string; timeframe: Timeframe }
    ) => {
      try {
        return await PerformanceGoalsService.getPerformanceGoalsByEmail(
          email,
          timeframe
        );
      } catch (error: any) {
        console.error("[PerformanceGoals Resolver] Error by email:", error);
        throw new Error(
          `Failed to fetch performance goals for ${email}: ${error.message}`
        );
      }
    },

    getLeadsCount: async (
      _: any,
      { timeframe }: { timeframe?: Timeframe }
    ) => {
      try {
        return await PerformanceGoalsService.getLeadsCount(timeframe);
      } catch (error: any) {
        console.error("[PerformanceGoals Resolver] Error getLeadsCount:", error);
        throw new Error(`Failed to fetch leads count: ${error.message}`);
      }
    },
  },
};
