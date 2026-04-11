import { gql } from "apollo-server-express";

export const leaderboardTypeDefs = gql`
  type LeaderboardMetric {
    actual: Int!
    target: Int!
    percentage: Float!
  }

  type SellerAdvisorStats {
    employeeId: ID!
    initials: String
    name: String
    callsConnected: Int!
    smsSent: Int!
    bookings: Int!
    monthlyGoal: Int!
    leadsConverted: Int!
    conversionPercentage: Float!
  }

  type SellerManagerStats {
    employeeId: ID!
    email: String
    initials: String
    name: String
    callsConnected: Int!
    smsSent: Int!
    firstCallSmsAttempts: LeaderboardMetric!
    newSellersContacted: LeaderboardMetric!
    followUpsAttempted: LeaderboardMetric!
    followUpsConnected: LeaderboardMetric!
    offersPresented: LeaderboardMetric!
    offersAccepted: LeaderboardMetric!
    psasExecuted: LeaderboardMetric!
    leadsConverted: LeaderboardMetric!
    totalLeads: Int!
    monthlyOffersGoal: Int!
    conversionPercentage: Float!
  }

  type LeaderboardResponse {
    sellerAdvisors: [SellerAdvisorStats!]!
    sellerManagers: [SellerManagerStats!]!
  }

  extend type Query {
    getLeaderboard(timeframe: Timeframe!): LeaderboardResponse!
  }
`;
