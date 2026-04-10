import { gql } from "apollo-server-express";

export const propertyDetailsTypeDefs = gql`
  type PropertyPhysicalHome {
    property_type: String
    bedrooms: Int
    bathrooms: Float
    number_of_half_bathrooms: Int
    sqft: Int
    lot_acres: Float
    year_built: Int
    pool: Boolean
    basement: String
    listing_status: String
  }

  type PropertyFeatures {
    air_conditioning_type: String
    ac_age: Int
    home_owners_association: String
  }

  type PropertyCondition {
    what_are_the_repairs_required: String
    electrical_condition: String
  }

  type PropertyLocationAndMarket {
    address: String
    city: String
    state: String
    zip_code: String
    latitude: Float
    longitude: Float
    folio_number_apn: String
    mls_number: String
  }

  type PropertyHOA {
    hoa: String
    hoa_fee: String
    frequency_of_hoa: String
    rental_restrictions: String
    hoa_costs_yearly: Float
  }

  type PropertyFinancialExpenses {
    # From crm_property_financials
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
    other_liens: String
    debt_total: Float
    is_in_foreclosure: Boolean
    estimated_foreclosure_date: String
    hei_in_place: Boolean
  }

  type PropertyInternalValuation {
    # From crm_property_financials
    arv: Float
    rehab_estimate: Float
    mao: Float
    estimated_rent: Float
  }

  type PropertyExternalValuation {
    # From crm_property_valuations
    house_canary: Float
    batch_data_arv: Float
    arv_after_repair: Float
    zillow_estimate: Float
    redfin_estimate: Float
    appraisal_value: Float
    appraisal_date: String
    price_per_sqft: Float
  }

  type PropertyRealtorInfo {
    # From crm_property_realtor_info
    listed_realtor: Boolean
    realtor_name: String
    realtor_phone: String
    realtor_email: String
    realtor_company: String
    listing_price: Float
    days_on_market: Int
  }

  type PropertyImages {
    # From crm_files / properties table array
    file_id: String
    file_url: String
    file_name: String
  }

  type PropertyValuations {
    internal: PropertyInternalValuation
    external: PropertyExternalValuation
  }

  # ── Seller profile (from crm_sellers) ──────────────────────────────────────

  type SellerProfile {
    seller_segment:   String   # from crm_leads
    motivation:       String
    urgency:          String
    marriage_status:  String   # mapped from current_marriage_status
    ownership_type:   String
    reason_for_selling: String
    timeline_flexibility: String
    desired_timeline: String
    open_to_leaseback: Boolean
  }

  type SellerFinancialProfile {
    seller_annual_income:    Float
    credit_score:            String  # mapped from credit_score_range
    sales_proceeds_needed:   Float
    is_in_bankruptcy:        Boolean
    asking_price:            Float
    minimum_acceptable_price: Float
    monthly_debts:           Float
  }

  type SellerLivingSituation {
    occupation:           String
    people_in_home:       Int     # mapped from occupants_count
    has_pets:             Boolean
    desired_lease_period: Int     # mapped from desired_leaseback_period
    years_lived_at_property: Int
    is_veteran:           Boolean
    military_status:      String
  }

  # ── Full record ───────────────────────────────────────────────────────────────

  type PropertyDetailsRecord {
    id: String!
    seller_name: String
    physical: PropertyPhysicalHome
    features: PropertyFeatures
    condition: PropertyCondition
    location: PropertyLocationAndMarket
    hoa: PropertyHOA
    financials: PropertyFinancialExpenses
    valuations: PropertyValuations
    realtor: PropertyRealtorInfo
    images: [PropertyImages]
    # Seller-related groups (populated from crm_leads + crm_sellers)
    seller_profile:    SellerProfile
    financial_profile: SellerFinancialProfile
    living_situation:  SellerLivingSituation
  }

  extend type Query {
    getPropertyDetailsById(propertyId: String!): PropertyDetailsRecord
  }
`;
