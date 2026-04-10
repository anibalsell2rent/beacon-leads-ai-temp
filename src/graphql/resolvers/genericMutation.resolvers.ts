import { upsertCrmRecord } from '../../services/genericMutation.service';
import GraphQLJSON from 'graphql-type-json';

export const genericMutationResolvers = {
    JSON: GraphQLJSON,
    Mutation: {
        upsertCrmRecord: async (_: any, { tableName, payload }: { tableName: string, payload: any }) => {
            try {
                return await upsertCrmRecord(tableName, payload);
            } catch (error: any) {
                throw new Error(error.message);
            }
        }
    }
};
