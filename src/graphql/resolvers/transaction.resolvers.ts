import { TransactionService } from "../../services/transaction.service";

export const transactionResolvers = {
  Query: {
    getTransactionByPropertyId: async (_: any, { propertyId }: { propertyId: string }) => {
      try {
        return await TransactionService.getTransactionByPropertyId(propertyId);
      } catch (error) {
        console.error("[GET TRANSACTION ERROR]", error);
        throw new Error("Failed to fetch transaction data");
      }
    },
    getDealOffers: async (_: any, { dealId }: { dealId: string }) => {
      try {
        return await TransactionService.getDealOffers(dealId);
      } catch (error) {
        console.error("[GET DEAL OFFERS ERROR]", error);
        throw new Error("Failed to fetch deal offers");
      }
    },
    getMatchedInvestors: async (_: any, { dealId }: { dealId: string }) => {
      try {
        return await TransactionService.getMatchedInvestors(dealId);
      } catch (error) {
        console.error("[GET MATCHED INVESTORS ERROR]", error);
        throw new Error("Failed to fetch matched investors");
      }
    },
    getTransactionChecklist: async (_: any, { dealId }: { dealId: string }) => {
      try {
        return await TransactionService.getTransactionChecklist(dealId);
      } catch (error) {
        console.error("[GET TRANSACTION CHECKLIST ERROR]", error);
        throw new Error("Failed to fetch transaction checklist");
      }
    },
  },
};
