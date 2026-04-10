import { PipelineService, PipelineFilters } from "../../services/pipeline.service";

export const pipelineResolvers = {
    Query: {
        getPipelineLeads: async (
            _: any,
            { filters, limit, offset }: { filters?: PipelineFilters; limit?: number; offset?: number }
        ) => {
            try {
                return await PipelineService.getPipelineLeads(filters || {}, limit, offset);
            } catch (error: any) {
                throw new Error(`Failed to fetch pipeline leads: ${error.message}`);
            }
        },
    },
};
