import { LeadDetailsService } from "../../services/leadDetails.service";

export const leadDetailsResolvers = {
    Query: {
        getLeadById: async (_: any, { id }: { id: string }) => {
            try {
                const leadDetails = await LeadDetailsService.getLeadById(id);
                return leadDetails;
            } catch (error) {
                console.error("[LEAD DETAILS QUERY ERROR]", error);
                throw new Error("Failed to fetch lead details");
            }
        },
    },
};
