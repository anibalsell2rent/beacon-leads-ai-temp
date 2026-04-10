import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  subWeeks,
  subMonths,
  subQuarters,
  subYears,
} from "date-fns";
import { hasuraQuery } from "../utils/hasura.client";

export type Timeframe =
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "THIS_QUARTER"
  | "YEAR_TO_DATE";

interface DateRange {
  start: Date;
  end: Date;
}

export class TeamPerformanceService {
  private static getDateRanges(timeframe: Timeframe): {
    current: DateRange;
    previous: DateRange;
  } {
    const now = new Date();

    switch (timeframe) {
      case "THIS_WEEK":
        return {
          current: { start: startOfWeek(now), end: endOfWeek(now) },
          previous: {
            start: startOfWeek(subWeeks(now, 1)),
            end: endOfWeek(subWeeks(now, 1)),
          },
        };
      case "THIS_MONTH":
        return {
          current: { start: startOfMonth(now), end: endOfMonth(now) },
          previous: {
            start: startOfMonth(subMonths(now, 1)),
            end: endOfMonth(subMonths(now, 1)),
          },
        };
      case "THIS_QUARTER":
        return {
          current: { start: startOfQuarter(now), end: endOfQuarter(now) },
          previous: {
            start: startOfQuarter(subQuarters(now, 1)),
            end: endOfQuarter(subQuarters(now, 1)),
          },
        };
      case "YEAR_TO_DATE":
        return {
          current: { start: startOfYear(now), end: now },
          previous: {
            start: startOfYear(subYears(now, 1)),
            end: subYears(now, 1),
          },
        };
      default:
        return {
          current: { start: startOfMonth(now), end: endOfMonth(now) },
          previous: {
            start: startOfMonth(subMonths(now, 1)),
            end: endOfMonth(subMonths(now, 1)),
          },
        };
    }
  }

  static async getMetrics(timeframe: Timeframe) {
    const { current, previous } = this.getDateRanges(timeframe);

    const getMetricsForPeriod = async (range: DateRange) => {
      // crm_leads dates  → timestamptz  → pass full ISO string
      // crm_deals dates  → date         → pass YYYY-MM-DD string
      const tsStart  = range.start.toISOString();
      const tsEnd    = range.end.toISOString();
      const dateStart = tsStart.split("T")[0];
      const dateEnd   = tsEnd.split("T")[0];

      const data = await hasuraQuery<{
        totalLeads: { aggregate: { count: number } };
        attendedBookings: { aggregate: { count: number } };
        offersPresented: { aggregate: { count: number } };
        offersAccepted: { aggregate: { count: number } };
        psasExecuted: { aggregate: { count: number } };
        leadsConverted: { aggregate: { count: number } };
        closedDeals: { lead_id: string | null }[];
      }>(
        `
        query TeamPerformanceMetrics(
          $tsStart:   timestamptz!
          $tsEnd:     timestamptz!
          $dateStart: date!
          $dateEnd:   date!
        ) {
          totalLeads: crm_leads_aggregate(
            where: {
              date_created: { _gte: $tsStart, _lte: $tsEnd }
              _or: [
                { reason_for_failure: { _is_null: true } }
                { reason_for_failure: { _nilike: "%Test%" } }
              ]
            }
          ) { aggregate { count } }

          attendedBookings: crm_leads_aggregate(
            where: {
              scheduled_meeting_date: { _gte: $tsStart, _lte: $tsEnd }
              result: { _ilike: "%Contacted%" }
            }
          ) { aggregate { count } }

          offersPresented: crm_deals_aggregate(
            where: { offer_presented_date: { _gte: $dateStart, _lte: $dateEnd } }
          ) { aggregate { count } }

          offersAccepted: crm_deals_aggregate(
            where: { offer_accepted_date: { _gte: $dateStart, _lte: $dateEnd } }
          ) { aggregate { count } }

          psasExecuted: crm_deals_aggregate(
            where: { psa_execution_date: { _gte: $dateStart, _lte: $dateEnd } }
          ) { aggregate { count } }

          leadsConverted: crm_deals_aggregate(
            where: { created_at: { _gte: $tsStart, _lte: $tsEnd } }
          ) { aggregate { count } }

          closedDeals: crm_deals(
            where: { actual_closing_date: { _gte: $dateStart, _lte: $dateEnd } }
          ) { lead_id }
        }
      `,
        { tsStart, tsEnd, dateStart, dateEnd }
      );

      // Compute avg net revenue for closed deals
      let avgRevenue = 0;
      const leadIds = data.closedDeals
        .map((d) => d.lead_id)
        .filter(Boolean) as string[];

      if (leadIds.length > 0) {
        const revenueData = await hasuraQuery<{
          crm_leads: { s2r_net_revenue: string | null }[];
        }>(
          `
          query AvgRevenue($leadIds: [uuid!]!) {
            crm_leads(where: { id: { _in: $leadIds } }) {
              s2r_net_revenue
            }
          }
        `,
          { leadIds }
        );

        const revenues = revenueData.crm_leads
          .map((l) => parseFloat(l.s2r_net_revenue ?? "0"))
          .filter((v) => !isNaN(v));

        if (revenues.length > 0) {
          avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
        }
      }

      return {
        totalLeads: data.totalLeads.aggregate.count,
        attendedBookings: data.attendedBookings.aggregate.count,
        offersPresented: data.offersPresented.aggregate.count,
        offersAccepted: data.offersAccepted.aggregate.count,
        psasExecuted: data.psasExecuted.aggregate.count,
        leadsConverted: data.leadsConverted.aggregate.count,
        avgRevenue,
      };
    };

    const [currentMetrics, previousMetrics] = await Promise.all([
      getMetricsForPeriod(current),
      getMetricsForPeriod(previous),
    ]);

    const formatMetric = (
      current: number,
      previous: number,
      goal: number = 0
    ) => ({
      current: current || 0,
      previous: previous || 0,
      goal,
    });

    return {
      totalLeads: formatMetric(
        currentMetrics.totalLeads,
        previousMetrics.totalLeads,
        1000
      ),
      attendedBookings: formatMetric(
        currentMetrics.attendedBookings,
        previousMetrics.attendedBookings,
        40
      ),
      offersPresented: formatMetric(
        currentMetrics.offersPresented,
        previousMetrics.offersPresented,
        25
      ),
      offersAccepted: formatMetric(
        currentMetrics.offersAccepted,
        previousMetrics.offersAccepted,
        16
      ),
      psasExecuted: formatMetric(
        currentMetrics.psasExecuted,
        previousMetrics.psasExecuted,
        12
      ),
      leadsConvertedToDeals: formatMetric(
        currentMetrics.leadsConverted,
        previousMetrics.leadsConverted,
        8
      ),
      avgNetRevenue: formatMetric(
        currentMetrics.avgRevenue,
        previousMetrics.avgRevenue,
        13000
      ),
    };
  }
}
