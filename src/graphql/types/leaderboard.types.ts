import { gql } from "apollo-server-express";

export const leaderboardTypeDefs = gql`
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
    initials: String
    name: String
    callsConnected: Int!
    smsSent: Int!
    offersPresented: Int!
    monthlyOffersGoal: Int!
    offersAccepted: Int!
    psasExecuted: Int!
    leadsConverted: Int!
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
