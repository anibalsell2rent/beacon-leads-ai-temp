import { LeaderboardService } from "../../services/leaderboard.service";
import { Timeframe } from "../../services/teamPerformance.service";

export const leaderboardResolvers = {
    Query: {
        getLeaderboard: async (_: any, { timeframe }: { timeframe: Timeframe }) => {
            try {
                return await LeaderboardService.getLeaderboard(timeframe);
            } catch (error: any) {
                throw new Error(`Failed to fetch leaderboard metrics: ${error.message}`);
            }
        },
    },
};
