import axios from "axios";
import {
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
