import axios from "axios";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  parseISO,
  isWithinInterval,
} from "date-fns";
import { Timeframe } from "../services/teamPerformance.service";
import { hasuraQuery } from "./hasura.client";

// ─── Constants ─────────────────────────────────────────────────────────────────

export const SELLER_MANAGER_ROLE_ID = "07ed4242-3905-4136-b225-4f9b3a6137af";
export const SELLER_ADVISOR_ROLE_ID = "89370776-e910-410a-8656-628f8691501d";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ZohoOwner {
  name: string;
  id: string;
  email: string;
}

export interface ZohoPerformanceGoal {
  id: string;
  Name: string;
  Owner: ZohoOwner;
  Starting_Date: string | null;
  End_Date: string | null;
  Converted_Leads_Target: number | null;
  Offers_Presented_Target: number | null;
  Offers_Accepted_Target: number | null;
  Revenue_Target: number | null;
  PSA_s_Executed_Target: number | null;
  Bookings_Attended_Target: number | null;
  Total_Leads_Target: number | null;
  First_Call_SMS_Attempts_Target: number | null;
  New_Sellers_Contacted_Target: number | null;
  Follow_Ups_Attempted_Target: number | null;
  Follow_Ups_Connected_Target: number | null;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface GoalMetric {
  actual: number;
  target: number;
  percentage: number;
  conversionRate?: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

export async function fetchZohoToken(): Promise<string | null> {
  try {
    const request = await axios.get(
      "https://zohotoken-663034886613.us-central1.run.app/api/zoho/token"
    );
    return (request.data as { token?: string }).token ?? null;
  } catch (error) {
    console.error("[ZohoGoals] Error fetching token:", error);
    return null;
  }
}

export function getDateRange(timeframe: Timeframe): DateRange {
  const now = new Date();
  switch (timeframe) {
    case "TODAY":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "THIS_WEEK":
      return { start: startOfWeek(now), end: endOfWeek(now) };
    case "THIS_MONTH":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "THIS_QUARTER":
      return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case "YEAR_TO_DATE":
      return { start: startOfYear(now), end: now };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

export async function fetchZohoPerformanceGoals(): Promise<ZohoPerformanceGoal[]> {
  const token = await fetchZohoToken();
  if (!token) return [];

  const fields = [
    "id",
    "Name",
    "Owner",
    "Starting_Date",
    "End_Date",
    "Converted_Leads_Target",
    "Offers_Presented_Target",
    "Offers_Accepted_Target",
    "Revenue_Target",
    "PSA_s_Executed_Target",
    "Bookings_Attended_Target",
    "Total_Leads_Target",
    "First_Call_SMS_Attempts_Target",
    "New_Sellers_Contacted_Target",
    "Follow_Ups_Attempted_Target",
    "Follow_Ups_Connected_Target",
  ].join(",");

  try {
    const response = await axios.get<{ data: ZohoPerformanceGoal[] }>(
      `https://www.zohoapis.com/crm/v3/Performance_Goals?fields=${fields}`,
      { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
    );
    return response.data?.data ?? [];
  } catch (error: any) {
    console.error("[ZohoGoals] Fetch error:", error?.response?.data || error.message);
    return [];
  }
}

export function filterGoalsByDateRange(
  goals: ZohoPerformanceGoal[],
  range: DateRange
): ZohoPerformanceGoal[] {
  return goals.filter((goal) => {
    if (!goal.Starting_Date || !goal.End_Date) return false;
    const goalStart = parseISO(goal.Starting_Date);
    const goalEnd = parseISO(goal.End_Date);
    return (
      isWithinInterval(goalStart, { start: range.start, end: range.end }) ||
      isWithinInterval(goalEnd, { start: range.start, end: range.end }) ||
      (goalStart <= range.start && goalEnd >= range.end)
    );
  });
}

export function buildGoalsByEmail(
  goals: ZohoPerformanceGoal[]
): Map<string, ZohoPerformanceGoal> {
  const map = new Map<string, ZohoPerformanceGoal>();
  for (const goal of goals) {
    const email = goal.Owner?.email?.toLowerCase();
    if (!email) continue;
    const existing = map.get(email);
    if (!existing) {
      map.set(email, goal);
    } else {
      const existingEnd = existing.End_Date ? parseISO(existing.End_Date) : new Date(0);
      const newEnd = goal.End_Date ? parseISO(goal.End_Date) : new Date(0);
      if (newEnd > existingEnd) map.set(email, goal);
    }
  }
  return map;
}

export function createMetric(
  actual: number,
  target: number | null,
  totalForConversion?: number
): GoalMetric {
  const safeTarget = target || 0;
  const percentage = safeTarget > 0 ? (actual / safeTarget) * 100 : 0;
  const conversionRate =
    totalForConversion && totalForConversion > 0
      ? (actual / totalForConversion) * 100
      : undefined;

  return {
    actual,
    target: safeTarget,
    percentage: parseFloat(percentage.toFixed(1)),
    conversionRate: conversionRate ? parseFloat(conversionRate.toFixed(1)) : undefined,
  };
}

// ─── COQL Queries ──────────────────────────────────────────────────────────────

interface COQLResponse {
  data: Record<string, any>[];
  info?: { count: number; more_records: boolean };
}

export async function executeCoqlQuery(query: string): Promise<Record<string, any>[]> {
  const token = await fetchZohoToken();
  if (!token) return [];

  try {
    const response = await axios.post<COQLResponse>(
      "https://www.zohoapis.com/crm/v3/coql",
      { select_query: query },
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data?.data ?? [];
  } catch (error: any) {
    console.error("[COQL] Query error:", error?.response?.data || error.message);
    return [];
  }
}

function formatDateOnly(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDateTimeISO(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

function getNextMonthStart(date: Date): string {
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return formatDateOnly(nextMonth);
}

export interface ManagerActuals {
  attendedBookings: number;
  offersPresented: number;
  offersAccepted: number;
  psasExecuted: number;
  convertedLeads: number;
}

export async function fetchManagerActualsFromZoho(
  ownerEmail: string,
  dateRange: DateRange
): Promise<ManagerActuals> {
  const startDate = formatDateOnly(dateRange.start);
  const endDateExclusive = getNextMonthStart(dateRange.end);
  const startDateTime = formatDateTimeISO(dateRange.start);
  const endDateTime = formatDateTimeISO(new Date(dateRange.end.getFullYear(), dateRange.end.getMonth() + 1, 1));

  const queries = {
    offersPresented: `select COUNT(id) as total from Leads where ((Seller_Manager.email = '${ownerEmail}') and (Offer_Presented_Date >= '${startDate}' and Offer_Presented_Date < '${endDateExclusive}')) GROUP BY Seller_Manager`,
    offersAccepted: `select COUNT(id) as total from Leads where ((Seller_Manager.email = '${ownerEmail}') and (Offer_Accepted_Date >= '${startDate}' and Offer_Accepted_Date < '${endDateExclusive}')) GROUP BY Seller_Manager`,
    psasExecuted: `select COUNT(id) as total from Leads where ((Seller_Manager.email = '${ownerEmail}') and (PSA_Execution_Date >= '${startDate}' and PSA_Execution_Date < '${endDateExclusive}')) GROUP BY Seller_Manager`,
    convertedLeads: `select COUNT(userlookup221_24.id) AS total, Seller_Manager from x11 where ((Seller_Manager.email = '${ownerEmail}') and (userlookup221_24.Created_Time >= '${startDateTime}' and userlookup221_24.Created_Time < '${endDateTime}')) GROUP BY Seller_Manager`,
  };

  const [
    offersPresentedRes,
    offersAcceptedRes,
    psasExecutedRes,
    convertedLeadsRes,
  ] = await Promise.all([
    executeCoqlQuery(queries.offersPresented),
    executeCoqlQuery(queries.offersAccepted),
    executeCoqlQuery(queries.psasExecuted),
    executeCoqlQuery(queries.convertedLeads),
  ]);

  return {
    attendedBookings: 0,
    offersPresented: offersPresentedRes[0]?.total ?? 0,
    offersAccepted: offersAcceptedRes[0]?.total ?? 0,
    psasExecuted: psasExecutedRes[0]?.total ?? 0,
    convertedLeads: convertedLeadsRes[0]?.total ?? 0,
  };
}

export async function fetchTotalLeadsFromZoho(dateRange: DateRange): Promise<number> {
  const startDateTime = formatDateTimeISO(dateRange.start);
  const endDateTime = formatDateTimeISO(new Date(dateRange.end.getFullYear(), dateRange.end.getMonth() + 1, 1));
  
  const query = `select COUNT(id) as total from Leads where (Created_Time >= '${startDateTime}' and Created_Time < '${endDateTime}')`;
  const result = await executeCoqlQuery(query);
  return result[0]?.total ?? 0;
}

export async function fetchAvgNetRevenueFromZoho(dateRange: DateRange): Promise<number> {
  const startDateTime = formatDateTimeISO(dateRange.start);
  const endDateTime = formatDateTimeISO(new Date(dateRange.end.getFullYear(), dateRange.end.getMonth() + 1, 1));
  
  const query = `select AVG(Net_S2R_Revenue) as avg_revenue from Deals where (Created_Time >= '${startDateTime}' and Created_Time < '${endDateTime}')`;
  const result = await executeCoqlQuery(query);
  return result[0]?.avg_revenue ?? 0;
}

export interface AllManagersActualsResult {
  managerActuals: Map<string, ManagerActuals>;
  totalLeads: number;
  avgNetRevenue: number;
}

// ─── Seller Managers Query ─────────────────────────────────────────────────────

export interface SellerManager {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  initials: string | null;
}

const SELLER_MANAGERS_QUERY = `
  query GetSellerManagers($roleId: uuid!) {
    users(where: { role_id: { _eq: $roleId }, is_active: { _eq: true } }) {
      id email first_name last_name initials
    }
  }
`;

export async function fetchSellerManagers(): Promise<SellerManager[]> {
  const data = await hasuraQuery<{ users: SellerManager[] }>(SELLER_MANAGERS_QUERY, {
    roleId: SELLER_MANAGER_ROLE_ID,
  });
  return data.users ?? [];
}

export async function fetchAllManagersActualsFromZoho(
  ownerEmails: string[],
  dateRange: DateRange
): Promise<AllManagersActualsResult> {
  const [managerResults, totalLeads, avgNetRevenue] = await Promise.all([
    Promise.all(
      ownerEmails.map(async (email) => ({
        email: email.toLowerCase(),
        actuals: await fetchManagerActualsFromZoho(email, dateRange),
      }))
    ),
    fetchTotalLeadsFromZoho(dateRange),
    fetchAvgNetRevenueFromZoho(dateRange),
  ]);

  return {
    managerActuals: new Map(managerResults.map((r) => [r.email, r.actuals])),
    totalLeads,
    avgNetRevenue,
  };
}
