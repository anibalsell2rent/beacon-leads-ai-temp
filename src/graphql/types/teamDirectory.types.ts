import { gql } from "apollo-server-express";

export const teamDirectoryTypeDefs = gql`
  type StaffMember {
    id: String!
    first_name: String
    last_name: String
    email: String
    initials: String
    department: String
    employee_code: String
    is_active: Boolean
    hire_date: String
    monthly_goal: Int
    quarterly_goal: Int
    yearly_goal: Int
    role_name: String
    role_type: String
    active_leads_count: Int
    active_deals_count: Int
  }

  type TeamMember {
    id: ID!
    first_name: String
    last_name: String
    initials: String
    email: String
    role: String
    active_leads: Int
    conversions: Int
    conversion_rate: Float
    leads_at_risk: Int
    monthly_goal: Int
  }

  type SellerProfile {
    id: String!
    first_name: String
    last_name: String
    phone: String
    mobile: String
    alt_phone: String
    email: String
    alt_email: String
    preferred_contact_method: String
    best_time_to_call: String
    language: String
    second_seller_first_name: String
    second_seller_last_name: String
    second_seller_phone: String
    second_seller_email: String
    second_seller_relationship: String
    mailing_address: String
    mailing_city: String
    mailing_state: String
    mailing_zip: String
    motivation: String
    urgency: String
    reason_for_selling: String
    timeline_flexibility: String
    wants_or_needs: String
    ultimate_seller_goals: String
    relationship_to_property: String
    need_to_sell_by: String
    date_of_birth: String
    age: Int
    occupation: String
    employer: String
    employment_status: String
    military_status: String
    is_veteran: Boolean
    current_marriage_status: String
    spouse_name: String
    open_to_leaseback: Boolean
    desired_leaseback_period: Int
    max_monthly_rent: Float
    asking_price: Float
    minimum_acceptable_price: Float
    seller_annual_income: Float
    total_household_income: Float
    credit_score_range: String
    monthly_debts: Float
    is_in_bankruptcy: Boolean
    idenfy_status: String
    opt_out_dnc: Boolean
    text_opt_out: Boolean
    email_opt_out: Boolean
    lead_id: String
    lead_stage: String
    property_address: String
    assigned_advisor: StaffMember
    assigned_manager: StaffMember
  }

  type TeamDirectoryResult {
    sellers:           [SellerProfile!]!
    seller_advisors:   [StaffMember!]!
    seller_managers:   [StaffMember!]!
    investor_advisors: [StaffMember!]!
    total_sellers:     Int!
    total_staff:       Int!
  }

  extend type Query {
    getTeamDirectory: TeamDirectoryResult!
    getSellerByLeadId(lead_id: String!): SellerProfile
    getStaffMember(id: String!): StaffMember
    getSellerAdvisors: [StaffMember!]!
    getSellerManagers: [StaffMember!]!
    getInvestorAdvisors: [StaffMember!]!
    getTeamMembers: [TeamMember!]!
  }
`;
