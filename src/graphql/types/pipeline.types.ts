import { gql } from "apollo-server-express";

export const pipelineTypeDefs = gql`
  type PipelineLead {
    id: ID!
    leadName: String
    state: String
    city: String
    score: Int
    source: String
    contractPrice: Float
    capRate: Float
    equity: Float
    advisorName: String
    managerName: String
    investorAdvisorName: String
    isInForeclosure: Boolean
    stageId: String
    revenue: Float
    lastUpdated: String
    isHot: Boolean
    lead_number: Int
    seller_name: String
    seller_segment: String
    property_address: String
    stage_name: String
    days_in_stage: Int
    lead_score: Int
    action_required: String
    propertyId: String
    phase: String
    desired_timeline: String
    days_on_market: Int
    s2r_net_revenue: Float
    result: String
    offer_date: String
    marketing_source: String
    leadNotes: String
  }

  input PipelineFilters {
    searchQuery: String
    stageIds: [String!]
    memberIds: [String!]
    memberEmail: String
    advisorId: String
    managerId: String
    advisorEmail: String
    managerEmail: String
    stageId: String
    isHot: Boolean
    search: String
    stages: [String!]
    fetchLimitPerStage: Int
  }

  type StageCount {
    stageId: String!
    count: Int!
  }

  type PipelineResponse {
    leads: [PipelineLead!]!
    totalCount: Int!
    stageCounts: [StageCount!]
  }

  extend type Query {
    getPipelineLeads(filters: PipelineFilters, limit: Int, offset: Int): PipelineResponse!
  }
`;
