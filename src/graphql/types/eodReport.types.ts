export const eodReportTypeDefs = `#graphql
  enum WinLoss {
    WIN
    LOSS
  }

  input EodReportInput {
    userId: Int!
    reportDate: String!
    winLoss: WinLoss!
    psasSigned: Int!
    offersAccepted: Int!
    psaSent: Int!
    followUpsTotal: Int!
    followUpsAmazing: Int!
    followUpsGood: Int!
    followUpsNeutral: Int!
    followUpsBad: Int!
    bookingsCompleted: Int!
    offersPresented: Int!
    leadsConverted: Int!
  }

  type EodReportResult {
    success: Boolean!
    reportId: String
    cliqMessageId: String
    error: String
  }

  extend type Mutation {
    submitEodReport(input: EodReportInput!): EodReportResult!
  }
`;
