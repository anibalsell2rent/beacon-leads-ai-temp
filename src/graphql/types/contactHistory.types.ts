import { gql } from "apollo-server-express";

export const contactHistoryTypeDefs = gql`
  type ContactHistoryActivity {
    id: String!
    activity_type_id: Int!
    type: String!
    type_label: String!
    is_ai: Boolean!
    direction: String
    created_at: String
    created_by: Int
    seller_id: Int
    lead_id: String
    property_id: String
    due_date: String
    zoho_id: String

    # user join (crm_activities.user)
    user_id: Int
    user_name: String
    user_first_name: String
    user_last_name: String
    user_initials: String

    # type-specific fields extracted from notes JSONB
    content: String
    subject: String
    result: String
    duration: Int
    recording_url: String
    thread: [String]
    tag: String
    status: String
    raw_notes: String
  }

  type ContactHistoryCounts {
    all: Int!
    call: Int!
    sms: Int!
    email: Int!
    note: Int!
    ai_call: Int!
    ai_sms: Int!
  }

  type ContactHistoryPagination {
    page: Int!
    limit: Int!
    total: Int!
  }

  type ContactHistoryResult {
    activities: [ContactHistoryActivity!]!
    counts: ContactHistoryCounts!
    pagination: ContactHistoryPagination!
  }

  type ContactHistoryTeamMember {
    id: Int!
    first_name: String
    last_name: String
    initials: String
  }

  input ContactHistoryFilters {
    type: String
    team: Int
    page: Int
    limit: Int
  }

  extend type Query {
    getContactHistoryBySeller(seller_id: Int!, filters: ContactHistoryFilters): ContactHistoryResult!
    getContactHistoryByLead(lead_id: String!, filters: ContactHistoryFilters): ContactHistoryResult!
    getContactHistoryTeam: [ContactHistoryTeamMember!]!
  }
`;

// ─── Activity type IDs (from crm_activity_types) ─────────────────────────────

export const ACTIVITY_TYPES = {
  CALL: 1,
  SMS: 2,
  EMAIL: 3,
  NOTE: 4,
  TASK: 5,
  EVENT: 6,
  AI_CALL: 7,
} as const;

// ─── TypeScript helper types ─────────────────────────────────────────────────

export interface ContactHistoryFilters {
  type?: string; // all | call | sms | email | note | ai_call | ai_sms
  team?: number;
  page?: number;
  limit?: number;
}

export interface RawActivityRow {
  id: number | string;
  activity_type_id: number;
  notes: Record<string, unknown> | string | null;
  created_by: number | null;
  created_at: string | null;
  seller_id: number | null;
  lead_id: string | null;
  property_id: string | null;
  due_date: string | null;
  zoho_id: string | null;
  user: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    initials: string | null;
  } | null;
  crm_activity_type: {
    id: number;
    name: string;
  } | null;
}

export interface ContactHistoryActivityDTO {
  id: string;
  activity_type_id: number;
  type: string;
  type_label: string;
  is_ai: boolean;
  direction: string | null;
  created_at: string | null;
  created_by: number | null;
  seller_id: number | null;
  lead_id: string | null;
  property_id: string | null;
  due_date: string | null;
  zoho_id: string | null;

  user_id: number | null;
  user_name: string | null;
  user_first_name: string | null;
  user_last_name: string | null;
  user_initials: string | null;

  content: string | null;
  subject: string | null;
  result: string | null;
  duration: number | null;
  recording_url: string | null;
  thread: string[] | null;
  tag: string | null;
  status: string | null;
  raw_notes: string | null;
}

export interface ContactHistoryCounts {
  all: number;
  call: number;
  sms: number;
  email: number;
  note: number;
  ai_call: number;
  ai_sms: number;
}

export interface ContactHistoryPagination {
  page: number;
  limit: number;
  total: number;
}

export interface ContactHistoryResult {
  activities: ContactHistoryActivityDTO[];
  counts: ContactHistoryCounts;
  pagination: ContactHistoryPagination;
}

export interface ContactHistoryTeamMember {
  id: number;
  first_name: string | null;
  last_name: string | null;
  initials: string | null;
}
