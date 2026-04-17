import { EodReportService } from "../../services/eodReport.service";

type WinLoss = "WIN" | "LOSS";

interface EodReportInput {
  userId: number;
  reportDate: string;
  winLoss: WinLoss;
  psasSigned: number;
  offersAccepted: number;
  psaSent: number;
  followUpsTotal: number;
  followUpsAmazing: number;
  followUpsGood: number;
  followUpsNeutral: number;
  followUpsBad: number;
  bookingsCompleted: number;
  offersPresented: number;
  leadsConverted: number;
}

export const eodReportResolvers = {
  Mutation: {
    submitEodReport: async (_: any, { input }: { input: EodReportInput }) => {
      try {
        return await EodReportService.submitReport(input);
      } catch (error: any) {
        console.error("[EodReport] Error submitEodReport:", error);
        return {
          success: false,
          error: error.message,
        };
      }
    },
  },
};
