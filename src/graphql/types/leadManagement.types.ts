import { gql } from "apollo-server-express";

export const leadManagementTypeDefs = gql`
  enum LeadTab {
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

  type User {
    id: Int!
    slug: String!
    name: String!
    email: String!
    initials: String!
    role: String!
  }

  type LeadNote {
    id: Int!
    content: String!
    timestamp: String!
    createdBy: Int!
    createdByName: String!
  }

  type Lead {
    id: String!
    name: String!
    email: String
    phone: String
    address: String
    city: String
    state: String
    zipCode: String
    leadTeamRating: LeadTeamRating
    stageId: String
    stageName: String
    assignedTo: Int
    assignedToName: String
    leadScore: Float
    s2rNetRevenue: Float
    sellerSegment: String
    marketingSource: String
    dateCreated: String
    updatedAt: String
    tabs: [LeadTab!]!
    notes: [LeadNote!]!
  }

  type ManagerLeadsResponse {
    hotLeads: [Lead!]!
    liveOffers: [Lead!]!
    pipelineFollowUps: [Lead!]!
    newLeads: [Lead!]!
    trackingDate: String!
  }

  type ManagerGoals {
    userId: Int!
    email: String!
    name: String!
    slug: String!
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

  extend type Query {
    getUserBySlug(slug: String!): User

    getManagerGoalsByUserId(
      userId: Int!
      timeframe: Timeframe!
    ): ManagerGoals

    getPriorityPanelLeads(managerId: Int!, trackingDate: String): ManagerLeadsResponse!

    searchLeads(
      query: String!
      limit: Int = 20
    ): [Lead!]!

    searchSellersForTab(
      query: String!
      tab: LeadTab!
      managerId: Int!
      trackingDate: String
      limit: Int = 20
    ): [Lead!]!

    getLeadsByManager(
      managerId: Int!
      stageId: Int
      limit: Int = 50
      offset: Int = 0
    ): [Lead!]!
  }

  extend type Mutation {
    addLeadToTab(
      managerId: Int!
      leadId: String!
      tab: LeadTab!
      trackingDate: String
    ): Lead!

    removeLeadFromTab(
      managerId: Int!
      leadId: String!
      tab: LeadTab!
      trackingDate: String
    ): Boolean!

    updateLeadRating(
      leadId: String!
      rating: LeadTeamRating
    ): Lead!

    updateLeadIsHot(
      leadId: String!
      isHot: Boolean!
    ): Lead!

    addLeadNote(
      leadId: String!
      content: String!
      createdBy: Int!
      trackingDate: String
    ): LeadNote!

    updateTrackingNote(
      noteId: Int!
      content: String!
    ): LeadNote!

    deleteTrackingNote(
      noteId: Int!
    ): Boolean!
  }
`;
