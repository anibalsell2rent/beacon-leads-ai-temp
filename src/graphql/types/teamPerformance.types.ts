import { gql } from "apollo-server-express";

export const teamPerformanceTypeDefs = gql`
  enum Timeframe {
    THIS_WEEK
    THIS_MONTH
    THIS_QUARTER
    YEAR_TO_DATE
  }

  type MetricValue {
    current: Float!
    previous: Float!
    goal: Float!
  }

  type TeamPerformanceMetrics {
    totalLeads: MetricValue!
    attendedBookings: MetricValue!
    offersPresented: MetricValue!
    offersAccepted: MetricValue!
    psasExecuted: MetricValue!
    leadsConvertedToDeals: MetricValue!
    avgNetRevenue: MetricValue!
  }

  extend type Query {
    getTeamPerformance(timeframe: Timeframe!): TeamPerformanceMetrics!
  }
`;
