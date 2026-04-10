import { TeamPerformanceService, Timeframe } from "../../services/teamPerformance.service";

export const teamPerformanceResolvers = {
    Query: {
        getTeamPerformance: async (_: any, { timeframe }: { timeframe: Timeframe }) => {
            try {
                return await TeamPerformanceService.getMetrics(timeframe);
            } catch (error: any) {
                throw new Error(`Failed to fetch team performance metrics: ${error.message}`);
            }
        },
    },
};
