import { gql } from "apollo-server-express";

export const analyticsTypeDefs = gql`
  type SourceBreakdown {
    source: String
    count: Int
    percentage: Float
    avg_score: Float
  }

  type FunnelStage {
    stage_id: String
    stage_name: String
    count: Int
    conversion_rate: Float
  }

  type WorkloadCell {
    employee_id: String
    employee_name: String
    stage_id: String
    stage_name: String
    count: Int
  }

  extend type Query {
    getLeadSourceBreakdown: [SourceBreakdown!]!
    getPipelineFunnel: [FunnelStage!]!
    getWorkloadHeatmap: [WorkloadCell!]!
  }
`;
