import { EngagementService } from "../../services/engagement.service";

export const engagementResolvers = {
  Query: {
    getActivityFeed: async (_: any, { limit, offset, employeeId }: { limit: number; offset: number; employeeId: string }) => {
      try {
        return await EngagementService.getActivityFeed(limit, offset, employeeId);
      } catch (error) {
        console.error("[GET ACTIVITY FEED ERROR]", error);
        throw new Error("Failed to fetch activity feed");
      }
    },
    getAtRiskLeads: async (_: any, { limit }: { limit: number }) => {
      try {
        return await EngagementService.getAtRiskLeads(limit);
      } catch (error) {
        console.error("[GET AT RISK LEADS ERROR]", error);
        throw new Error("Failed to fetch at-risk leads");
      }
    },
  },
};
