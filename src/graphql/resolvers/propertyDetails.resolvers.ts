import { PropertyDetailsService } from "../../services/propertyDetails.service";

export const propertyDetailsResolvers = {
    Query: {
        getPropertyDetailsById: async (_: any, { propertyId }: { propertyId: string }) => {
            try {
                const details = await PropertyDetailsService.getPropertyDetailsById(propertyId);
                return details; // details might be null, which is valid and handled politely by GraphQL
            } catch (error: any) {
                console.error("Error in getPropertyDetailsById resolver:", error);
                throw new Error(error.message || "Failed to fetch Property Details");
            }
        },
    },
};
