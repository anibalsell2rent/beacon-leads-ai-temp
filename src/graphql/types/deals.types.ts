import { gql } from "apollo-server-express";

export const dealsTypeDefs = gql`
  type DealProperty {
    id: String
    address: String
    city: String
    state: String
    zip_code: String
    property_type: String
    bedrooms: Int
    bathrooms: Float
    sqft: Int
    year_built: Int
  }

  type Deal {
    id: ID!
    deal_number: Int
    lead_id: String
    stage_id: String
    status: String
    status_label: String
    offer_value: Float
    actual_closing_date: String
    property_id: String
    property_address: String
    property: DealProperty
    created_at: String
  }

  extend type Query {
    getDeals(status: String, limit: Int): [Deal!]!
  }
`;
