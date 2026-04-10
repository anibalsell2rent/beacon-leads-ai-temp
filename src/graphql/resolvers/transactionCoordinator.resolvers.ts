import { TransactionCoordinatorService } from "../../services/transactionCoordinator.service";

export const transactionCoordinatorResolvers = {
  Query: {
    tcPropertyDocuments: async (_: any, { property_id }: { property_id: string }) => {
      try {
        return await TransactionCoordinatorService.getPropertyDocuments(property_id);
      } catch (error: any) {
        console.error("[TC] tcPropertyDocuments error:", error?.message ?? error);
        throw new Error(`Failed to fetch property documents: ${error?.message ?? error}`);
      }
    },

    tcValidateMandatoryDocuments: async (_: any, { property_id }: { property_id: string }) => {
      try {
        return await TransactionCoordinatorService.validateMandatoryDocuments(property_id);
      } catch (error: any) {
        console.error("[TC] tcValidateMandatoryDocuments error:", error?.message ?? error);
        throw new Error(`Failed to validate mandatory documents: ${error?.message ?? error}`);
      }
    },

    tcMandatoryDocumentsProgress: async (_: any, { property_id }: { property_id: string }) => {
      try {
        return await TransactionCoordinatorService.getMandatoryDocumentsProgress(property_id);
      } catch (error: any) {
        console.error("[TC] tcMandatoryDocumentsProgress error:", error?.message ?? error);
        throw new Error(`Failed to fetch documents progress: ${error?.message ?? error}`);
      }
    },

    tcAllDocumentsChecklist: async (_: any, { property_id }: { property_id: string }) => {
      try {
        return await TransactionCoordinatorService.getAllDocumentsChecklist(property_id);
      } catch (error: any) {
        console.error("[TC] tcAllDocumentsChecklist error:", error?.message ?? error);
        throw new Error(`Failed to fetch documents checklist: ${error?.message ?? error}`);
      }
    },

    tcAllDocumentsType: async () => {
      try {
        return await TransactionCoordinatorService.getAllDocumentsType();
      } catch (error: any) {
        console.error("[TC] tcAllDocumentsType error:", error?.message ?? error);
        throw new Error(`Failed to fetch document types: ${error?.message ?? error}`);
      }
    },

    tcGetTransactionNotes: async (_: any, { property_id }: { property_id: string }) => {
      try {
        return await TransactionCoordinatorService.getTransactionNotes(property_id);
      } catch (error: any) {
        console.error("[TC] tcGetTransactionNotes error:", error?.message ?? error);
        throw new Error(`Failed to fetch transaction notes: ${error?.message ?? error}`);
      }
    },

    tcGetSignedUrl: async (_: any, { documentId }: { documentId: number }) => {
      try {
        return await TransactionCoordinatorService.getSignedUrl(documentId);
      } catch (error: any) {
        console.error("[TC] tcGetSignedUrl error:", error?.message ?? error);
        throw new Error(`Failed to fetch signed URL: ${error?.message ?? error}`);
      }
    },
  },
};
