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
    bookingsAmazing: Int!
    bookingsGood: Int!
    bookingsNeutral: Int!
    bookingsBad: Int!
    offersPresented: Int!
    offersPresentedAmazing: Int!
    offersPresentedGood: Int!
    offersPresentedNeutral: Int!
    offersPresentedBad: Int!
    leadsConverted: Int!
    notes: String
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
