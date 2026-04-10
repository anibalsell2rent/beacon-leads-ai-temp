import { gql } from "apollo-server-express";

export const individualDashboardTypeDefs = gql`
  type GoalProgress {
    current: Int
    goal: Int
    percentage: Float
    delta: Int
  }

  type IndividualSummary {
    connectedCalls: Int
    smsSent: Int
    bookingsCompleted: GoalProgress
    leadsConverted: GoalProgress
  }

  type IndividualDashboard {
    summary: IndividualSummary
    hotLeads: [PipelineLead]
    dailyOrganizer: [PipelineLead]
    pipelineLeads: [PipelineLead]
  }

  extend type Query {
    getIndividualDashboard(employeeId: String!): IndividualDashboard
  }
`;
