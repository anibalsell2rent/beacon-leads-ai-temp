import { gql } from "apollo-server-express";

export const engagementTypeDefs = gql`
  type ActivityItem {
    id: ID!
    employee_id: String
    type: String
    description: String
    lead_id: String
    lead_name: String
    timestamp: String
  }

  type ActivityFeedResponse {
    items: [ActivityItem!]!
    totalCount: Int
  }

  type AtRiskLead {
    id: ID!
    lead_name: String
    advisor_name: String
    stage_name: String
    days_in_stage: Int
    result: String
    last_updated: String
    reason: String
  }

  extend type Query {
    getActivityFeed(limit: Int, offset: Int, employeeId: String): ActivityFeedResponse!
    getAtRiskLeads(limit: Int): [AtRiskLead!]!
  }
`;
