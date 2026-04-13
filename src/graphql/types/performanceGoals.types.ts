import { gql } from "apollo-server-express";

export const performanceGoalsTypeDefs = gql`
  type PerformanceGoalMetric {
    actual: Float!
    target: Float!
    percentage: Float!
    conversionRate: Float
    targetConversionRate: Float
  }

  type SellerManagerGoals {
    userId: Int!
    email: String!
    name: String!
    initials: String!
    goalId: String
    goalName: String
    startingDate: String
    endDate: String
    firstCallSmsAttempts: PerformanceGoalMetric!
    newSellersContacted: PerformanceGoalMetric!
    followUpsAttempted: PerformanceGoalMetric!
    followUpsConnected: PerformanceGoalMetric!
    offersPresented: PerformanceGoalMetric!
    offersAccepted: PerformanceGoalMetric!
    psasExecuted: PerformanceGoalMetric!
    leadsConverted: PerformanceGoalMetric!
  }

  type TeamPerformanceGoals {
    attendedBookings: PerformanceGoalMetric!
    offersPresented: PerformanceGoalMetric!
    offersAccepted: PerformanceGoalMetric!
    psasExecuted: PerformanceGoalMetric!
    leadsConverted: PerformanceGoalMetric!
    avgNetRevenue: PerformanceGoalMetric!
    totalLeads: PerformanceGoalMetric!
  }

  type PerformanceGoalsResponse {
    teamGoals: TeamPerformanceGoals!
    managerGoals: [SellerManagerGoals!]!
  }

  extend type Query {
    getPerformanceGoals(timeframe: Timeframe!): PerformanceGoalsResponse!
    getPerformanceGoalsByEmail(email: String!, timeframe: Timeframe!): SellerManagerGoals
    getLeadsCount(timeframe: Timeframe!): Int!
  }
`;
