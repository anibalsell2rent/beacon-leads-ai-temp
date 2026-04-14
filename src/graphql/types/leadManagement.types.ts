import { gql } from "apollo-server-express";

export const leadManagementTypeDefs = gql`
  enum ManagerLeadTab {
    HOT_LEAD
    LIVE_OFFER
    PIPELINE_FOLLOW_UP
    NEW_LEAD
  }

  enum LeadTeamRating {
    AMAZING
    GOOD
    NEUTRAL
    BAD
  }

  type LeadNote {
    content: String!
    timestamp: String!
  }

  type LeadUser {
    id: Int!
    email: String!
    firstName: String
    lastName: String
    slug: String
    initials: String
  }

  type Lead {
    id: ID!
    fullName: String
    email: String
    phone: String
    address: String
    city: String
    state: String
    zipCode: String
    propertyType: String
    leadSource: String
    leadStatus: String
    result: String
    dateCreated: String
    lastActivityDate: String
    scheduledBookingDate: String
    sellerManager: LeadUser
    sellerAdvisor: LeadUser
    leadTeamRating: LeadTeamRating
    notes: [LeadNote!]!
    currentTabs: [ManagerLeadTab!]!
  }

  type LeadConnection {
    leads: [Lead!]!
    totalCount: Int!
    hasNextPage: Boolean!
  }

  type PerformanceMetric {
    actual: Int!
    target: Int!
    percentage: Float!
    conversionRate: Float
  }

  type UserPerformance {
    userId: Int!
    email: String!
    name: String!
    slug: String
    initials: String
    offersPresented: PerformanceMetric!
    offersAccepted: PerformanceMetric!
    psasExecuted: PerformanceMetric!
    leadsConverted: PerformanceMetric!
  }

  type TabCount {
    tab: ManagerLeadTab!
    count: Int!
  }

  type ManagerLeadsResponse {
    leads: LeadConnection!
    tabCounts: [TabCount!]!
  }

  extend type Query {
    getManagerLeads(
      managerId: Int!
      tab: ManagerLeadTab
      limit: Int
      offset: Int
    ): ManagerLeadsResponse!

    getLeadDetails(leadId: ID!): Lead

    getManagerPerformance(
      managerId: Int!
      timeframe: Timeframe!
    ): UserPerformance
  }

  extend type Mutation {
    addLeadToTab(
      managerId: Int!
      leadId: ID!
      tab: ManagerLeadTab!
    ): Boolean!

    removeLeadFromTab(
      managerId: Int!
      leadId: ID!
      tab: ManagerLeadTab!
    ): Boolean!

    updateLeadTeamRating(
      leadId: ID!
      rating: LeadTeamRating!
    ): Lead
  }
`;
