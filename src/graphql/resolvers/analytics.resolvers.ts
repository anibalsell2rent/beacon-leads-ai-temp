import { AnalyticsService } from "../../services/analytics.service";

export const analyticsResolvers = {
  Query: {
    getLeadSourceBreakdown: async () => {
      try {
        return await AnalyticsService.getLeadSourceBreakdown();
      } catch (error) {
        console.error("[GET LEAD SOURCE BREAKDOWN ERROR]", error);
        throw new Error("Failed to fetch lead source breakdown");
      }
    },
    getPipelineFunnel: async () => {
      try {
        return await AnalyticsService.getPipelineFunnel();
      } catch (error) {
        console.error("[GET PIPELINE FUNNEL ERROR]", error);
        throw new Error("Failed to fetch pipeline funnel");
      }
    },
    getWorkloadHeatmap: async () => {
      try {
        return await AnalyticsService.getWorkloadHeatmap();
      } catch (error) {
        console.error("[GET WORKLOAD HEATMAP ERROR]", error);
        throw new Error("Failed to fetch workload heatmap");
      }
    },
  },
};
