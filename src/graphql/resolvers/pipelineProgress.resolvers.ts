import { PipelineProgressService } from "../../services/pipelineProgress.service";

export const pipelineProgressResolvers = {
    Query: {
        getPipelineProgress: async (_: any, { leadId }: { leadId: string }) => {
            try {
                return await PipelineProgressService.getPipelineProgress(leadId);
            } catch (error) {
                console.error("Error in getPipelineProgress resolver:", error);
                throw new Error("Failed to fetch Pipeline Progress");
            }
        },
    },
};
