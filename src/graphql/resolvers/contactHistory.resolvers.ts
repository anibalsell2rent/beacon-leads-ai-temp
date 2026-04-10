import { ContactHistoryService } from "../../services/contactHistory.service";
import type { ContactHistoryFilters } from "../types/contactHistory.types";

export const contactHistoryResolvers = {
  Query: {
    getContactHistoryBySeller: async (
      _: unknown,
      { seller_id, filters }: { seller_id: number; filters?: ContactHistoryFilters }
    ) => {
      try {
        return await ContactHistoryService.getBySeller(seller_id, filters ?? {});
      } catch (error) {
        console.error("[CONTACT HISTORY BY SELLER ERROR]", error);
        throw new Error("Failed to fetch contact history by seller");
      }
    },

    getContactHistoryByLead: async (
      _: unknown,
      { lead_id, filters }: { lead_id: string; filters?: ContactHistoryFilters }
    ) => {
      try {
        return await ContactHistoryService.getByLead(lead_id, filters ?? {});
      } catch (error) {
        console.error("[CONTACT HISTORY BY LEAD ERROR]", error);
        throw new Error("Failed to fetch contact history by lead");
      }
    },

    getContactHistoryTeam: async () => {
      try {
        return await ContactHistoryService.getTeamMembers();
      } catch (error) {
        console.error("[CONTACT HISTORY TEAM ERROR]", error);
        throw new Error("Failed to fetch contact history team");
      }
    },
  },
};
