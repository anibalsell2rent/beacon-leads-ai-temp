import { TeamDirectoryService } from "../../services/teamDirectory.service";

export const teamDirectoryResolvers = {
  Query: {
    // Full directory: sellers + all staff
    getTeamDirectory: async () => {
      try {
        return await TeamDirectoryService.getTeamDirectory();
      } catch (error) {
        console.error("[TEAM DIRECTORY QUERY ERROR]", error);
        throw new Error("Failed to fetch team directory");
      }
    },

    // Individual seller by lead_id
    getSellerByLeadId: async (_: any, { lead_id }: { lead_id: string }) => {
      try {
        return await TeamDirectoryService.getSellerByLeadId(lead_id);
      } catch (error) {
        console.error("[GET SELLER BY LEAD ID ERROR]", error);
        throw new Error("Failed to fetch seller");
      }
    },

    // Single staff member by id
    getStaffMember: async (_: any, { id }: { id: string }) => {
      try {
        return await TeamDirectoryService.getStaffMember(id);
      } catch (error) {
        console.error("[GET STAFF MEMBER ERROR]", error);
        throw new Error("Failed to fetch staff member");
      }
    },

    // All Team Members 
    getTeamMembers: async () => {
      try {
        return await TeamDirectoryService.getTeamMembers();
      } catch (error) {
        console.error("[GET TEAM MEMBERS ERROR]", error);
        throw new Error("Failed to fetch team members");
      }
    },

    // Filtered lists
    getSellerAdvisors: async () => {
      try {
        return await TeamDirectoryService.getStaffByRoleKeyword("SELLER_ADVISOR");
      } catch (error) {
        console.error("[GET SELLER ADVISORS ERROR]", error);
        throw new Error("Failed to fetch seller advisors");
      }
    },

    getSellerManagers: async () => {
      try {
        // Seller Manager role UUID from roles table
        const SELLER_MANAGER_ROLE_ID = "07ed4242-3905-4136-b225-4f9b3a613e9c";
        return await TeamDirectoryService.getStaffByRoleId(SELLER_MANAGER_ROLE_ID);
      } catch (error) {
        console.error("[GET SELLER MANAGERS ERROR]", error);
        throw new Error("Failed to fetch seller managers");
      }
    },

    getInvestorAdvisors: async () => {
      try {
        return await TeamDirectoryService.getStaffByRoleKeyword("INVESTOR_ADVISOR");
      } catch (error) {
        console.error("[GET INVESTOR ADVISORS ERROR]", error);
        throw new Error("Failed to fetch investor advisors");
      }
    },
  },
};
