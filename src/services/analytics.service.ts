import { hasuraQuery } from "../utils/hasura.client";

export class AnalyticsService {
  // ── Lead Source Breakdown ──────────────────────────────────────────────────
  static async getLeadSourceBreakdown() {
    const data = await hasuraQuery<{
      crm_leads: { marketing_source: string | null; lead_score: number | null }[];
      crm_leads_aggregate: { aggregate: { count: number } };
    }>(`
      query LeadSourceBreakdown {
        crm_leads { marketing_source lead_score }
        crm_leads_aggregate { aggregate { count } }
      }
    `);

    const totalLeads = data.crm_leads_aggregate.aggregate.count;
    if (totalLeads === 0) return [];

    // Group by marketing_source in application layer
    const groups = new Map<string, { count: number; scoreSum: number }>();
    for (const lead of data.crm_leads) {
      const src = lead.marketing_source ?? "Unknown";
      const g = groups.get(src) ?? { count: 0, scoreSum: 0 };
      g.count++;
      g.scoreSum += lead.lead_score ?? 0;
      groups.set(src, g);
    }

    return Array.from(groups.entries()).map(([source, g]) => ({
      source,
      count: g.count,
      percentage: (g.count / totalLeads) * 100,
      avg_score: g.count > 0 ? g.scoreSum / g.count : 0,
    }));
  }

  // ── Pipeline Funnel ────────────────────────────────────────────────────────
  static async getPipelineFunnel() {
    const data = await hasuraQuery<{
      crm_leads: { stage_id: string | null }[];
      crm_leads_aggregate: { aggregate: { count: number } };
      crm_stages: { id: string; name: string }[];
    }>(`
      query PipelineFunnel {
        crm_leads { stage_id }
        crm_leads_aggregate { aggregate { count } }
        crm_stages { id name }
      }
    `);

    const totalLeads = data.crm_leads_aggregate.aggregate.count;
    if (totalLeads === 0) return [];

    const stagesMap = new Map(data.crm_stages.map((s) => [s.id, s.name]));

    // Group by stage_id in application layer
    const stageCounts = new Map<string, number>();
    for (const lead of data.crm_leads) {
      const sid = lead.stage_id ?? "unassigned";
      stageCounts.set(sid, (stageCounts.get(sid) ?? 0) + 1);
    }

    return Array.from(stageCounts.entries()).map(([stage_id, count]) => ({
      stage_id,
      stage_name:
        stage_id !== "unassigned"
          ? stagesMap.get(stage_id) ?? "Unknown Stage"
          : "No Stage",
      count,
      conversion_rate: (count / totalLeads) * 100,
    }));
  }

  // ── Workload Heatmap ───────────────────────────────────────────────────────
  static async getWorkloadHeatmap() {
    const data = await hasuraQuery<{
      crm_leads: { seller_advisor_id: string | null; stage_id: string | null }[];
      crm_employees: {
        id: string;
        user_id: number | null;
        first_name: string | null;
        last_name: string | null;
      }[];
      crm_stages: { id: string; name: string }[];
    }>(`
      query WorkloadHeatmap {
        crm_leads(
          where: {
            seller_advisor_id: { _is_null: false }
            stage_id: { _is_null: false }
          }
        ) {
          seller_advisor_id
          stage_id
        }
        crm_employees { id user_id first_name last_name }
        crm_stages { id name }
      }
    `);

    if (data.crm_leads.length === 0) return [];

    // Build advisor name map (supports both UUID id and numeric user_id)
    const advisorsMap = new Map<string, string>();
    for (const emp of data.crm_employees) {
      const name = `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim();
      advisorsMap.set(String(emp.id), name);
      if (emp.user_id != null) advisorsMap.set(String(emp.user_id), name);
    }

    const stagesMap = new Map(data.crm_stages.map((s) => [s.id, s.name]));

    // Group by (seller_advisor_id, stage_id) in application layer
    const groups = new Map<
      string,
      { employee_id: string; stage_id: string; count: number }
    >();
    for (const lead of data.crm_leads) {
      const key = `${lead.seller_advisor_id}__${lead.stage_id}`;
      const g = groups.get(key) ?? {
        employee_id: lead.seller_advisor_id!,
        stage_id: lead.stage_id!,
        count: 0,
      };
      g.count++;
      groups.set(key, g);
    }

    return Array.from(groups.values()).map((g) => ({
      employee_id: g.employee_id,
      employee_name:
        advisorsMap.get(g.employee_id) ?? "Unknown Advisor",
      stage_id: g.stage_id,
      stage_name: stagesMap.get(g.stage_id) ?? "Unknown Stage",
      count: g.count,
    }));
  }
}
