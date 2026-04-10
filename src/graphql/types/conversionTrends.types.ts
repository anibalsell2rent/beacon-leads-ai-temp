import { gql } from "apollo-server-express";

export const conversionTrendsTypeDefs = gql`
  type MonthlyTrend {
    month: String!
    conversions: Int!
    hitGoal: Boolean!
  }

  type SourceMetric {
    source: String!
    count: Int!
    percentage: Float!
  }

  type ConversionDashboardResponse {
    dynamicGoal: Float!
    trends: [MonthlyTrend!]!
    sources: [SourceMetric!]!
  }

  extend type Query {
    getConversionDashboard: ConversionDashboardResponse!
  }
`;
