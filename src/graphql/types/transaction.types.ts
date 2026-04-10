import { gql } from "apollo-server-express";

export const transactionTypeDefs = gql`
  type Offer {
    id: ID!
    investor_name: String
    investor_company: String
    offer_amount: Float
    offer_type: String
    status: String
    created_at: String
    expiration_date: String
    terms: String
  }

  type ChecklistItem {
    step_id: String!
    completed: Boolean
    completed_at: String
    completed_by: String
  }

  type Document {
    id: ID!
    name: String
    category: String
    source: String
    status: String
    uploaded_at: String
    file_url: String
  }

  type Note {
    id: ID!
    author: String
    content: String
    created_at: String
  }

  type InvestorMatch {
    id: ID!
    name: String
    company: String
    offer_amount: Float
    cap_rate: Float
    match_score: Float
  }

  type TransactionData {
    property_id: String!
    lead_id: String
    phase: String
    offers: [Offer]
    checklist: [ChecklistItem]
    documents: [Document]
    notes: [Note]
    investors: [InvestorMatch]
  }

  extend type Query {
    getTransactionByPropertyId(propertyId: String!): TransactionData
    getDealOffers(dealId: String!): [Offer]
    getMatchedInvestors(dealId: String!): [InvestorMatch]
    getTransactionChecklist(dealId: String!): [ChecklistItem]
  }
`;
