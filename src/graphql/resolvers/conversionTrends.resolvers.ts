import { ConversionTrendsService } from "../../services/conversionTrends.service";

export const conversionTrendsResolvers = {
    Query: {
        getConversionDashboard: async () => {
            try {
                return await ConversionTrendsService.getConversionDashboard();
            } catch (error: any) {
                throw new Error(`Failed to fetch conversion dashboard: ${error.message}`);
            }
        },
    },
};
