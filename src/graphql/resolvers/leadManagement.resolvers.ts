import { LeadManagementService } from "../../services/leadManagement.service";
import { Timeframe } from "../../services/teamPerformance.service";

type ManagerLeadTab = "HOT_LEAD" | "LIVE_OFFER" | "PIPELINE_FOLLOW_UP" | "NEW_LEAD";
type LeadTeamRating = "AMAZING" | "GOOD" | "NEUTRAL" | "BAD";

export const leadManagementResolvers = {
  Query: {
    getManagerLeads: async (
      _: any,
      {
        managerId,
        tab,
        limit = 20,
        offset = 0,
      }: {
        managerId: number;
        tab?: ManagerLeadTab;
        limit?: number;
        offset?: number;
      }
    ) => {
      try {
        return await LeadManagementService.getManagerLeads(managerId, tab, limit, offset);
      } catch (error: any) {
        console.error("[LeadManagement Resolver] Error getManagerLeads:", error);
        throw new Error(`Failed to fetch manager leads: ${error.message}`);
      }
    },

    getLeadDetails: async (_: any, { leadId }: { leadId: string }) => {
      try {
        return await LeadManagementService.getLeadDetails(leadId);
      } catch (error: any) {
        console.error("[LeadManagement Resolver] Error getLeadDetails:", error);
        throw new Error(`Failed to fetch lead details: ${error.message}`);
      }
    },

    getManagerPerformance: async (
      _: any,
      { managerId, timeframe }: { managerId: number; timeframe: Timeframe }
    ) => {
      try {
        return await LeadManagementService.getManagerPerformance(managerId, timeframe);
      } catch (error: any) {
        console.error("[LeadManagement Resolver] Error getManagerPerformance:", error);
        throw new Error(`Failed to fetch manager performance: ${error.message}`);
      }
    },
  },

  Mutation: {
    addLeadToTab: async (
      _: any,
      {
        managerId,
        leadId,
        tab,
      }: {
        managerId: number;
        leadId: string;
        tab: ManagerLeadTab;
      }
    ) => {
      try {
        return await LeadManagementService.addLeadToTab(managerId, leadId, tab);
      } catch (error: any) {
        console.error("[LeadManagement Resolver] Error addLeadToTab:", error);
        throw new Error(`Failed to add lead to tab: ${error.message}`);
      }
    },

    removeLeadFromTab: async (
      _: any,
      {
        managerId,
        leadId,
        tab,
      }: {
        managerId: number;
        leadId: string;
        tab: ManagerLeadTab;
      }
    ) => {
      try {
        return await LeadManagementService.removeLeadFromTab(managerId, leadId, tab);
      } catch (error: any) {
        console.error("[LeadManagement Resolver] Error removeLeadFromTab:", error);
        throw new Error(`Failed to remove lead from tab: ${error.message}`);
      }
    },

    updateLeadTeamRating: async (
      _: any,
      { leadId, rating }: { leadId: string; rating: LeadTeamRating }
    ) => {
      try {
        return await LeadManagementService.updateLeadTeamRating(leadId, rating);
      } catch (error: any) {
        console.error("[LeadManagement Resolver] Error updateLeadTeamRating:", error);
        throw new Error(`Failed to update lead rating: ${error.message}`);
      }
    },
  },
};
