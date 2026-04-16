import { LeadManagementService } from "../../services/leadManagement.service";
import { Timeframe } from "../../services/teamPerformance.service";

type LeadTab = "HOT_LEAD" | "LIVE_OFFER" | "PIPELINE_FOLLOW_UP" | "NEW_LEAD";
type LeadTeamRating = "AMAZING" | "GOOD" | "NEUTRAL" | "BAD";

export const leadManagementResolvers = {
  Query: {
    getUserBySlug: async (_: any, { slug }: { slug: string }) => {
      try {
        return await LeadManagementService.getUserBySlug(slug);
      } catch (error: any) {
        console.error("[LeadManagement] Error getUserBySlug:", error);
        throw new Error(`Failed to fetch user: ${error.message}`);
      }
    },

    getManagerGoalsByUserId: async (
      _: any,
      { userId, timeframe }: { userId: number; timeframe: Timeframe }
    ) => {
      try {
        return await LeadManagementService.getManagerGoalsByUserId(userId, timeframe);
      } catch (error: any) {
        console.error("[LeadManagement] Error getManagerGoalsByUserId:", error);
        throw new Error(`Failed to fetch manager goals: ${error.message}`);
      }
    },

    getPriorityPanelLeads: async (
      _: any,
      { managerId, trackingDate }: { managerId: number; trackingDate?: string }
    ) => {
      try {
        return await LeadManagementService.getManagerLeads(managerId, trackingDate);
      } catch (error: any) {
        console.error("[LeadManagement] Error getPriorityPanelLeads:", error);
        throw new Error(`Failed to fetch priority panel leads: ${error.message}`);
      }
    },

    searchLeads: async (
      _: any,
      { query, limit = 20 }: { query: string; limit?: number }
    ) => {
      try {
        return await LeadManagementService.searchLeads(query, limit);
      } catch (error: any) {
        console.error("[LeadManagement] Error searchLeads:", error);
        throw new Error(`Failed to search leads: ${error.message}`);
      }
    },

    searchSellersForTab: async (
      _: any,
      { query, tab, managerId, trackingDate, limit = 20 }: { query: string; tab: LeadTab; managerId: number; trackingDate?: string; limit?: number }
    ) => {
      try {
        return await LeadManagementService.searchSellersForTab(query, tab, managerId, trackingDate, limit);
      } catch (error: any) {
        console.error("[LeadManagement] Error searchSellersForTab:", error);
        throw new Error(`Failed to search sellers for tab: ${error.message}`);
      }
    },

    getLeads: async (
      _: any,
      { managerId, stageId, limitPerStage = 50 }: { managerId?: number; stageId?: string; limitPerStage?: number }
    ) => {
      try {
        return await LeadManagementService.getLeads(managerId, stageId, limitPerStage);
      } catch (error: any) {
        console.error("[LeadManagement] Error getLeads:", error);
        throw new Error(`Failed to get leads: ${error.message}`);
      }
    },
  },

  Mutation: {
    addLeadToTab: async (
      _: any,
      { managerId, leadId, tab, trackingDate }: { managerId: number; leadId: string; tab: LeadTab; trackingDate?: string }
    ) => {
      try {
        return await LeadManagementService.addLeadToTab(managerId, leadId, tab, trackingDate);
      } catch (error: any) {
        console.error("[LeadManagement] Error addLeadToTab:", error);
        throw new Error(`Failed to add lead to tab: ${error.message}`);
      }
    },

    removeLeadFromTab: async (
      _: any,
      { managerId, leadId, tab, trackingDate }: { managerId: number; leadId: string; tab: LeadTab; trackingDate?: string }
    ) => {
      try {
        return await LeadManagementService.removeLeadFromTab(managerId, leadId, tab, trackingDate);
      } catch (error: any) {
        console.error("[LeadManagement] Error removeLeadFromTab:", error);
        throw new Error(`Failed to remove lead from tab: ${error.message}`);
      }
    },

    updateLeadRating: async (
      _: any,
      { leadId, rating }: { leadId: string; rating?: LeadTeamRating }
    ) => {
      try {
        return await LeadManagementService.updateLeadRating(leadId, rating ?? null);
      } catch (error: any) {
        console.error("[LeadManagement] Error updateLeadRating:", error);
        throw new Error(`Failed to update lead rating: ${error.message}`);
      }
    },

    updateLeadIsHot: async (
      _: any,
      { leadId, isHot }: { leadId: string; isHot: boolean }
    ) => {
      try {
        return await LeadManagementService.updateLeadIsHot(leadId, isHot);
      } catch (error: any) {
        console.error("[LeadManagement] Error updateLeadIsHot:", error);
        throw new Error(`Failed to update lead is_hot: ${error.message}`);
      }
    },

    addLeadNote: async (
      _: any,
      { leadId, content, createdBy, trackingDate }: { leadId: string; content: string; createdBy: number; trackingDate?: string }
    ) => {
      try {
        return await LeadManagementService.addLeadNote(leadId, content, createdBy, trackingDate);
      } catch (error: any) {
        console.error("[LeadManagement] Error addLeadNote:", error);
        throw new Error(`Failed to add lead note: ${error.message}`);
      }
    },

    updateTrackingNote: async (
      _: any,
      { noteId, content }: { noteId: number; content: string }
    ) => {
      try {
        return await LeadManagementService.updateTrackingNote(noteId, content);
      } catch (error: any) {
        console.error("[LeadManagement] Error updateTrackingNote:", error);
        throw new Error(`Failed to update tracking note: ${error.message}`);
      }
    },

    deleteTrackingNote: async (
      _: any,
      { noteId }: { noteId: number }
    ) => {
      try {
        return await LeadManagementService.deleteTrackingNote(noteId);
      } catch (error: any) {
        console.error("[LeadManagement] Error deleteTrackingNote:", error);
        throw new Error(`Failed to delete tracking note: ${error.message}`);
      }
    },
  },
};
