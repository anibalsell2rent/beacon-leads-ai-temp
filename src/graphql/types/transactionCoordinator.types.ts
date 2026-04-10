import { gql } from "apollo-server-express";

export const transactionCoordinatorTypeDefs = gql`
  # ── PropertyDocument ──────────────────────────────────────────────────────────
  type TCPropertyDocument {
    id: Int!
    property_id: String!
    file_name: String!
    file_size: Float
    document_type: String!
    signed_url: String
    signed_url_expires_at: String
    uploaded_at: String
    status: String
    processed_at: String
    created_at: String!
    updated_at: String!
  }

  # ── allDocumentsChecklist ─────────────────────────────────────────────────────
  type TCFileInfo {
    id: String
    file_name: String
    status: String
    document_type: String
    url: String
    private: String
  }

  type TCDocumentChecklistItem {
    document_type: String!
    is_mandatory: Boolean!
    is_uploaded: Boolean!
    file_info: [TCFileInfo]
  }

  type TCChecklistStatistics {
    progress: Int
    uploadedCount: Int
    missingCount: Int
    overallProgress: Int
    isComplete: Boolean
  }

  type TCDocumentsChecklist {
    checklist: [TCDocumentChecklistItem!]!
    statistics: TCChecklistStatistics!
  }

  # ── validateMandatoryDocuments ────────────────────────────────────────────────
  type TCDocumentMandatoryStatus {
    document_type: String!
    is_mandatory: Boolean!
  }

  type TCMandatoryDocumentsValidation {
    isComplete: Boolean!
    missingDocuments: [TCDocumentMandatoryStatus!]!
  }

  # ── mandatoryDocumentsProgress ────────────────────────────────────────────────
  type TCMandatoryDocumentsProgress {
    progress: Int!
    totalMandatory: Int!
    uploadedCount: Int!
    missingCount: Int!
    uploadedDocuments: [TCDocumentMandatoryStatus!]!
    missingDocuments: [TCDocumentMandatoryStatus!]!
    isComplete: Boolean!
  }

  # ── TransactionCoordinatorAnalysis ───────────────────────────────────────────
  type TCTransactionNote {
    id: Int!
    property_id: String!
    analyze_version: String
    stage: String
    analyze: JSON
    created_at: String!
    updated_at: String!
    user_id: Int
  }

  # ── SignedUrlResponse ─────────────────────────────────────────────────────────
  type TCSignedUrlResponse {
    signedUrl: String!
    expiresAt: String!
    isRefreshed: Boolean!
  }

  # ── Queries ───────────────────────────────────────────────────────────────────
  extend type Query {
    tcPropertyDocuments(property_id: String!): [TCPropertyDocument!]!
    tcValidateMandatoryDocuments(property_id: String!): TCMandatoryDocumentsValidation!
    tcMandatoryDocumentsProgress(property_id: String!): TCMandatoryDocumentsProgress!
    tcAllDocumentsChecklist(property_id: String!): TCDocumentsChecklist!
    tcAllDocumentsType: [String!]!
    tcGetTransactionNotes(property_id: String!): [TCTransactionNote!]!
    tcGetSignedUrl(documentId: Int!): TCSignedUrlResponse!
  }
`;
