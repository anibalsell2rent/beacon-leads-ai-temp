import axios from "axios";
import { hasuraQuery } from "../utils/hasura.client";

// ─── Types ─────────────────────────────────────────────────────────────────────

type WinLoss = "WIN" | "LOSS";

interface EodReportInput {
  userId: number;
  reportDate: string;
  winLoss: WinLoss;
  psasSigned?: number;
  offersAccepted?: number;
  psaSent?: number;
  followUpsTotal?: number;
  followUpsAmazing?: number;
  followUpsGood?: number;
  followUpsNeutral?: number;
  followUpsBad?: number;
  bookingsCompleted?: number;
  bookingsAmazing?: number;
  bookingsGood?: number;
  bookingsNeutral?: number;
  bookingsBad?: number;
  offersPresented?: number;
  offersPresentedAmazing?: number;
  offersPresentedGood?: number;
  offersPresentedNeutral?: number;
  offersPresentedBad?: number;
  leadsConverted?: number;
  notes?: string;
}

interface EodReportResult {
  success: boolean;
  reportId?: string;
  cliqMessageId?: string;
  error?: string;
}

// ─── Hasura Mutations ──────────────────────────────────────────────────────────

const UPSERT_EOD_REPORT_MUTATION = `
  mutation UpsertEodReport($object: eod_reports_insert_input!) {
    insert_eod_reports_one(
      object: $object
      on_conflict: {
        constraint: eod_reports_manager_id_report_date_key
        update_columns: [
          win_loss, psas_signed, offers_accepted, psa_sent,
          follow_ups_total, follow_ups_amazing, follow_ups_good, follow_ups_neutral, follow_ups_bad,
          bookings_completed,
          offers_presented_total, offers_presented_amazing, offers_presented_good, offers_presented_neutral, offers_presented_bad,
          leads_converted, manager_name, notes
        ]
      }
    ) {
      id
    }
  }
`;

const UPDATE_EOD_REPORT_CLIQ_MUTATION = `
  mutation UpdateEodReportCliq($id: Int!, $cliqMessageId: String!, $sentAt: timestamp!, $channelName: String!) {
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

function buildBreakdown(amazing: number, good: number, neutral: number, bad: number): string {
  return ` (${amazing} Amazing, ${good} Good, ${neutral} Neutral, ${bad} Bad)`;
}

function hasBreakdown(amazing: number, good: number, neutral: number, bad: number): boolean {
  return amazing > 0 || good > 0 || neutral > 0 || bad > 0;
}

function buildCliqMessage(input: EodReportInput, userName: string): string {
  const emoji = input.winLoss === "WIN" ? "🟢 WIN" : "🔴 LOSS";
  const formattedDate = formatDate(input.reportDate);

  const psasSigned = input.psasSigned ?? 0;
  const offersAccepted = input.offersAccepted ?? 0;
  const psaSent = input.psaSent ?? 0;
  const followUpsTotal = input.followUpsTotal ?? 0;
  const followUpsAmazing = input.followUpsAmazing ?? 0;
  const followUpsGood = input.followUpsGood ?? 0;
  const followUpsNeutral = input.followUpsNeutral ?? 0;
  const followUpsBad = input.followUpsBad ?? 0;
  const bookingsCompleted = input.bookingsCompleted ?? 0;
  const bookingsAmazing = input.bookingsAmazing ?? 0;
  const bookingsGood = input.bookingsGood ?? 0;
  const bookingsNeutral = input.bookingsNeutral ?? 0;
  const bookingsBad = input.bookingsBad ?? 0;
  const offersPresented = input.offersPresented ?? 0;
  const offersPresentedAmazing = input.offersPresentedAmazing ?? 0;
  const offersPresentedGood = input.offersPresentedGood ?? 0;
  const offersPresentedNeutral = input.offersPresentedNeutral ?? 0;
  const offersPresentedBad = input.offersPresentedBad ?? 0;
  const leadsConverted = input.leadsConverted ?? 0;

  const lines: string[] = [`${emoji} — ${userName} Recap ${formattedDate}:`];

  lines.push(`PSAs SIGNED: ${psasSigned}`);
  lines.push(`OFFERS ACCEPTED: ${offersAccepted}`);
  lines.push(`PSA Sent: ${psaSent}`);

  // Follow Ups - show breakdown if any value > 0
  if (hasBreakdown(followUpsAmazing, followUpsGood, followUpsNeutral, followUpsBad)) {
    lines.push(`Follow Ups: (${followUpsTotal})${buildBreakdown(followUpsAmazing, followUpsGood, followUpsNeutral, followUpsBad)}`);
  } else {
    lines.push(`Follow Ups: (${followUpsTotal})`);
  }

  // Bookings Completed - show breakdown if any value > 0
  if (hasBreakdown(bookingsAmazing, bookingsGood, bookingsNeutral, bookingsBad)) {
    lines.push(`Bookings Completed: (${bookingsCompleted})${buildBreakdown(bookingsAmazing, bookingsGood, bookingsNeutral, bookingsBad)}`);
  } else {
    lines.push(`Bookings Completed: (${bookingsCompleted})`);
  }

  // Offers Presented - show breakdown if any value > 0
  if (hasBreakdown(offersPresentedAmazing, offersPresentedGood, offersPresentedNeutral, offersPresentedBad)) {
    lines.push(`Offers Presented: (${offersPresented})${buildBreakdown(offersPresentedAmazing, offersPresentedGood, offersPresentedNeutral, offersPresentedBad)}`);
  } else {
    lines.push(`Offers Presented: (${offersPresented})`);
  }

  lines.push(`Leads Converted: ${leadsConverted}`);

  if (input.notes) {
    lines.push(`\n📝 ${input.notes}`);
  }

  return lines.join("\n");
}

async function sendToZohoCliq(message: string, channelName = "selleradvisors"): Promise<string> {
  const ZOHO_CLIQ_FUNCTION_URL = "https://www.zohoapis.com/crm/v7/functions/sa_cliq_channel_message/actions/execute";
  const ZOHO_API_KEY = "1003.23ca1b7ff6f39c31b3a8efe66761183c.b73486f7dddc13b7717f09892da9679e";

  const response = await axios.get(ZOHO_CLIQ_FUNCTION_URL, {
    params: {
      auth_type: "apikey",
      zapikey: ZOHO_API_KEY,
      channel_name: channelName,
      channel_message: message,
    },
  });

  return response.data?.details?.id ?? response.data?.message_id ?? "sent";
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

      // 3. Upsert to eod_reports table
      const insertData = await hasuraQuery<{
        insert_eod_reports_one: { id: number };
      }>(UPSERT_EOD_REPORT_MUTATION, {
        object: {
          manager_id: input.userId,
          manager_name: userName,
          report_date: input.reportDate,
          win_loss: input.winLoss,
          psas_signed: input.psasSigned ?? 0,
          offers_accepted: input.offersAccepted ?? 0,
          psa_sent: input.psaSent ?? 0,
          follow_ups_total: input.followUpsTotal ?? 0,
          follow_ups_amazing: input.followUpsAmazing ?? 0,
          follow_ups_good: input.followUpsGood ?? 0,
          follow_ups_neutral: input.followUpsNeutral ?? 0,
          follow_ups_bad: input.followUpsBad ?? 0,
          bookings_completed: input.bookingsCompleted ?? 0,
          offers_presented_total: input.offersPresented ?? 0,
          offers_presented_amazing: input.offersPresentedAmazing ?? 0,
          offers_presented_good: input.offersPresentedGood ?? 0,
          offers_presented_neutral: input.offersPresentedNeutral ?? 0,
          offers_presented_bad: input.offersPresentedBad ?? 0,
          leads_converted: input.leadsConverted ?? 0,
          notes: input.notes ?? null,
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
