import { investorsQuery } from "../utils/investors.client";

export class TransactionCoordinatorService {
  static async getPropertyDocuments(propertyId: string) {
    const data = await investorsQuery<{ propertyDocuments: any[] }>(
      `query GetPropertyDocuments($property_id: String!) {
        propertyDocuments(property_id: $property_id) {
          id
          property_id
          file_name
          file_size
          document_type
          signed_url
          signed_url_expires_at
          uploaded_at
          status
          processed_at
          created_at
          updated_at
        }
      }`,
      { property_id: propertyId }
    );
    return data.propertyDocuments;
  }

  static async validateMandatoryDocuments(propertyId: string) {
    const data = await investorsQuery<{ validateMandatoryDocuments: any }>(
      `query ValidateMandatoryDocuments($property_id: String!) {
        validateMandatoryDocuments(property_id: $property_id) {
          isComplete
          missingDocuments {
            document_type
            is_mandatory
          }
        }
      }`,
      { property_id: propertyId }
    );
    return data.validateMandatoryDocuments;
  }

  static async getMandatoryDocumentsProgress(propertyId: string) {
    const data = await investorsQuery<{ mandatoryDocumentsProgress: any }>(
      `query MandatoryDocumentsProgress($property_id: String!) {
        mandatoryDocumentsProgress(property_id: $property_id) {
          progress
          totalMandatory
          uploadedCount
          missingCount
          uploadedDocuments {
            document_type
            is_mandatory
          }
          missingDocuments {
            document_type
            is_mandatory
          }
          isComplete
        }
      }`,
      { property_id: propertyId }
    );
    return data.mandatoryDocumentsProgress;
  }

  static async getAllDocumentsChecklist(propertyId: string) {
    const data = await investorsQuery<{ allDocumentsChecklist: any }>(
      `query AllDocumentsChecklist($property_id: String!) {
        allDocumentsChecklist(property_id: $property_id) {
          checklist {
            document_type
            is_mandatory
            is_uploaded
            file_info {
              id
              file_name
              status
              document_type
              url
              private
            }
          }
          statistics {
            progress
            uploadedCount
            missingCount
            overallProgress
            isComplete
          }
        }
      }`,
      { property_id: propertyId }
    );
    return data.allDocumentsChecklist;
  }

  static async getAllDocumentsType() {
    const data = await investorsQuery<{ allDocumentsType: string[] }>(
      `query { allDocumentsType }`
    );
    return data.allDocumentsType;
  }

  static async getTransactionNotes(propertyId: string) {
    const data = await investorsQuery<{ getTransactionNotes: any[] }>(
      `query GetTransactionNotes($property_id: String!) {
        getTransactionNotes(property_id: $property_id) {
          id
          property_id
          analyze_version
          stage
          analyze
          created_at
          updated_at
          user_id
        }
      }`,
      { property_id: propertyId }
    );
    return data.getTransactionNotes;
  }

  static async getSignedUrl(documentId: number) {
    const data = await investorsQuery<{ getSignedUrl: any }>(
      `query GetSignedUrl($documentId: Int!) {
        getSignedUrl(documentId: $documentId) {
          signedUrl
          expiresAt
          isRefreshed
        }
      }`,
      { documentId }
    );
    return data.getSignedUrl;
  }
}
