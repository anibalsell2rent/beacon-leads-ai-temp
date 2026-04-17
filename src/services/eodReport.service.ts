import axios from "axios";
import { hasuraQuery } from "../utils/hasura.client";

// ─── Types ─────────────────────────────────────────────────────────────────────

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

interface EodReportResult {
  success: boolean;
  reportId?: string;
  cliqMessageId?: string;
  error?: string;
}

// ─── Zoho Token ────────────────────────────────────────────────────────────────

const zohoToken = async (): Promise<string> => {
  const request = await axios.get("https://zohotoken-663034886613.us-central1.run.app/api/zoho/token");
  const token = (request.data as { token?: string }).token;
  if (!token) throw new Error("Zoho token not found");
  return token;
};

// ─── Hasura Mutations ──────────────────────────────────────────────────────────

const INSERT_EOD_REPORT_MUTATION = `
  mutation InsertEodReport($object: eod_reports_insert_input!) {
    insert_eod_reports_one(object: $object) {
      id
    }
  }
`;

const UPDATE_EOD_REPORT_CLIQ_MUTATION = `
  mutation UpdateEodReportCliq($id: Int!, $cliqMessageId: String!, $sentAt: timestamptz!, $channelName: String!) {
    update_eod_reports_by_pk(
      pk_columns: { id: $id }
      _set: { cliq_message_id: $cliqMessageId, sent_to_cliq_at: $sentAt, cliq_channel_name: $channelName }
    ) {
      id
    }
  }
`;

const GET_USER_NAME_QUERY = `
  query GetUserName($userId: Int!) {
    users_by_pk(id: $userId) {
      first_name
      last_name
    }
  }
`;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function validateBreakdowns(input: EodReportInput): void {
  const followUpsSum =
    input.followUpsAmazing + input.followUpsGood + input.followUpsNeutral + input.followUpsBad;

  if (followUpsSum !== input.followUpsTotal) {
    throw new Error(
      `Follow ups breakdown (${followUpsSum}) does not match total (${input.followUpsTotal})`
    );
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function buildCliqMessage(input: EodReportInput, userName: string): string {
  const emoji = input.winLoss === "WIN" ? "🟢 WIN" : "🔴 LOSS";
  const formattedDate = formatDate(input.reportDate);

  return `${emoji} — ${userName} Recap ${formattedDate}:
PSAs SIGNED: ${input.psasSigned}
OFFERS ACCEPTED: ${input.offersAccepted}
PSA Sent: ${input.psaSent}
Follow Ups: (${input.followUpsTotal}) (${input.followUpsAmazing} Amazing, ${input.followUpsGood} Good, ${input.followUpsNeutral} Neutral, ${input.followUpsBad} Bad)
Bookings Completed: ${input.bookingsCompleted}
Offers Presented: (${input.offersPresented})
Leads Converted: ${input.leadsConverted}`;
}

async function sendToZohoCliq(message: string): Promise<string> {
  const token = await zohoToken();
  const channelUniqueName = "selleradvisors";

  const response = await axios.post(
    `https://cliq.zoho.com/api/v2/channelsbyname/${channelUniqueName}/message`,
    { text: message },
    {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data?.id ?? response.data?.message_id ?? "sent";
}

// ─── Service ───────────────────────────────────────────────────────────────────

export class EodReportService {
  static async submitReport(input: EodReportInput): Promise<EodReportResult> {
    try {
      // 1. Validate breakdowns
      validateBreakdowns(input);

      // 2. Get user name
      const userData = await hasuraQuery<{
        users_by_pk: { first_name: string | null; last_name: string | null } | null;
      }>(GET_USER_NAME_QUERY, { userId: input.userId });

      const firstName = userData.users_by_pk?.first_name ?? "";
      const lastName = userData.users_by_pk?.last_name ?? "";
      const userName = `${firstName} ${lastName}`.trim() || `User ${input.userId}`;

      // 3. Save to eod_reports table
      const insertData = await hasuraQuery<{
        insert_eod_reports_one: { id: number };
      }>(INSERT_EOD_REPORT_MUTATION, {
        object: {
          manager_id: input.userId,
          manager_name: userName,
          report_date: input.reportDate,
          win_loss: input.winLoss,
          psas_signed: input.psasSigned,
          offers_accepted: input.offersAccepted,
          psa_sent: input.psaSent,
          follow_ups_total: input.followUpsTotal,
          follow_ups_amazing: input.followUpsAmazing,
          follow_ups_good: input.followUpsGood,
          follow_ups_neutral: input.followUpsNeutral,
          follow_ups_bad: input.followUpsBad,
          bookings_completed: input.bookingsCompleted,
          offers_presented_total: input.offersPresented,
          leads_converted: input.leadsConverted,
        },
      });

      const reportId = insertData.insert_eod_reports_one.id;

      // 4. Build message for Cliq
      const message = buildCliqMessage(input, userName);

      // 5. Send to Zoho Cliq
      const cliqMessageId = await sendToZohoCliq(message);

      // 6. Update report with Cliq info
      const channelName = "selleradvisors";
      await hasuraQuery(UPDATE_EOD_REPORT_CLIQ_MUTATION, {
        id: reportId,
        cliqMessageId,
        sentAt: new Date().toISOString(),
        channelName,
      });

      // 7. Return success
      return {
        success: true,
        reportId: String(reportId),
        cliqMessageId,
      };
    } catch (error: any) {
      console.error("[EodReportService] Error submitting report:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
