import { gql } from 'apollo-server-express';

/*
    Upserts a record in any CRM table. 
    If 'id' is provided in the payload and exists, it updates.
    If 'id' is missing, it creates a new record.
    'tableName' must exactly match the Sequelize model name (e.g. "CrmLeads").
*/

export const genericMutationTypeDefs = gql`
  scalar JSON

  type GenericMutationResponse {
    success: Boolean!
    message: String
    record: JSON
  }

  type Mutation {
    upsertCrmRecord(tableName: String!, payload: JSON!): GenericMutationResponse!
  }
`;
