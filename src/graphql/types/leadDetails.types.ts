import { gql } from 'apollo-server-express';

export const leadDetailsTypeDefs = gql`
  type EmployeeProfile {
    id: String
    first_name: String
    last_name: String
    email: String
    initials: String
  }

  type LeadSeller {
    id: String
    # Contact Info
    first_name: String
    last_name: String
    phone: String
    mobile: String
    alt_phone: String
    email: String
    alt_email: String
    preferred_contact_method: String
    best_time_to_call: String
    idenfy_status: String

    # Second Seller / Co-Owner
    second_seller_first_name: String
    second_seller_last_name: String
    second_seller_phone: String
    second_seller_email: String
    second_seller_relationship: String

    # Seller Situation
    story: String
    urgency: String
    motivation: String
    reason_for_selling: String
    timeline_flexibility: String
    wants_or_needs: String
    ultimate_seller_goals: String
    relationship_to_property: String
    ownership_type: String
    need_to_sell_by: String
    desired_timeline: String
    current_marriage_status: String
    spouse_name: String
    divorce_status: String
    divorce_attorney: String
    probate_status: String
    estate_attorney: String
    has_power_of_attorney: Boolean
    poa_name: String

    # Seller Profile
    date_of_birth: String
    age: Int
    occupation: String
    employer: String
    employment_status: String
    years_employed: Int
    military_status: String
    is_veteran: Boolean

    # Living Situation
    years_lived_at_property: Int
    occupants_count: Int
    occupant_details: String
    has_pets: Boolean
    pet_types: String
    pet_count: Int

    # Financial Profile
    asking_price: Float
    minimum_acceptable_price: Float
    sales_proceeds_needed: Float
    equity_needed: Float
    seller_annual_income: Float
    total_household_income: Float
    credit_score_range: String
    monthly_debts: Float
    debt_to_income_ratio: Float
    is_in_bankruptcy: Boolean
    bankruptcy_type: String
    bankruptcy_status: String
    bankruptcy_discharge_date: String

    # Lease Expectations
    desired_leaseback_period: Int
    max_monthly_rent: Float
    preferred_move_out_date: String
    open_to_leaseback: Boolean
    leaseback_terms: String

    # Mailing Address
    mailing_address: String
    mailing_city: String
    mailing_state: String
    mailing_zip: String
  }

  type LeadFinancials {
    id: String
    # Expenses & Constraints
    mtg_remaining_balance: Float
    mtg_monthly_payment: Float
    second_mtg_balance: Float
    second_mtg_monthly_payment: Float
    interest_rate: Float
    va_fha_mortgage: String
    taxes_per_year: Float
    tax_debt: Float
    home_insurance_yearly: Float
    financed_solar_balance: Float
    hei_in_place: Boolean
    home_equity_investor_info: String
    other_liens: String
    debt_total: Float
    
    # Foreclosure
    is_in_foreclosure: Boolean
    estimated_foreclosure_date: String
    block_foreclosure: String

    # Summary Numbers
    sellers_gross_equity: Float
    hoa_balance: Float
    cash_to_seller: Float
  }

  type LeadScoreSection {
    seller_score: Float
    property_score: Float
    transaction_score: Float
    investor_score: Float
    s2r_fee: Float
    total: Float
  }

  type LeadScore {
    initial: LeadScoreSection
    final: LeadScoreSection
  }

  type LeadProperty {
    id: String
    street_address: String
    city: String
    state: String
    zip: String
    county: String
    days_on_market: Int
  }

  type LeadDetails {
    id: String!
    lead_number: Int
    seller_name: String
    is_hot: Boolean
    lead_score: Float
    stage_id: String
    s2r_net_revenue: Float
    contract_price: Float
    marketing_source: String
    seller_segment: String
    pippin_status: String
    last_updated: String
    created_at: String
    
    seller: LeadSeller
    financials: LeadFinancials
    property: LeadProperty
    score: LeadScore
    advisor: EmployeeProfile
    manager: EmployeeProfile
  }

  extend type Query {
    getLeadById(id: String!): LeadDetails
  }
`;
