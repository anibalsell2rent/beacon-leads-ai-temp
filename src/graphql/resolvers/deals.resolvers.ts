import { DealsService } from "../../services/deals.service";

export const dealsResolvers = {
  Query: {
    getDeals: async (_: any, { status, limit }: { status?: string, limit?: number }) => {
      try {
        return await DealsService.getDeals(status, limit || 50);
      } catch (error) {
        console.error("[GET DEALS ERROR]", error);
        throw new Error("Failed to fetch deals");
      }
    },
  },
};
