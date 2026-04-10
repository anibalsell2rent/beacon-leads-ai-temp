import { gql } from "apollo-server-express";

export const pipelineProgressTypeDefs = gql`
  type PipelineStageProgress {
    stage_id: String
    stage_name: String
    position: Int
    is_current: Boolean
    is_completed: Boolean
    days_target: Int
    days_spent: Int
    team_member: String
    team_role: String
  }

  type PipelineTaskCheck {
    label: String
    is_done: Boolean
    team_role: String
  }

  type PipelineStageDetail {
    stage_id: String
    stage_name: String
    status: String
    progress_pct: Float
    tasks_done: Int
    tasks_total: Int
    days_target: Int
    team_member: String
    team_role: String
    checks: [PipelineTaskCheck]
  }

  type PipelineTrack {
    pipeline_type: String
    status: String
    total_days: Int
    progress_pct: Float
    tasks_done: Int
    tasks_total: Int
    current_stage_id: String
    current_stage_name: String
    stages: [PipelineStageProgress]
    stage_details: [PipelineStageDetail]
  }

  type PipelineProgressResult {
    lead_id: String!
    leads_pipeline: PipelineTrack
    deals_pipeline: PipelineTrack
  }

  extend type Query {
    getPipelineProgress(leadId: String!): PipelineProgressResult
  }
`;
