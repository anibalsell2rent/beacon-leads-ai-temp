import { CrmLeads } from "../models/crm_leads.model";
import { CrmActivities } from "../models/crm_activities.model";
import { CrmEmployees } from "../models/crm_employees.model";
import { CrmSellers } from "../models/crm_sellers.model";
import { CrmStages } from "../models/crm_stages.model";
import { Op } from "sequelize";
import { sequelize } from "../config/database.config";

export class EngagementService {
  static async getActivityFeed(limit: number, offset: number, employeeId?: string) {
    const whereClause: any = {};
    if (employeeId) {
      whereClause.created_by = employeeId;
    }

    const { count, rows: rawActivities } = await CrmActivities.findAndCountAll({
      where: whereClause,
      order: [["created_at", "DESC"]],
      limit: limit || 50,
      offset: offset || 0,
      raw: true,
    });

    if (rawActivities.length === 0) {
      return { items: [], totalCount: count };
    }

    const leadIds = [...new Set(rawActivities.map((a: any) => a.lead_id).filter(Boolean))];
    const employeeIds = [...new Set(rawActivities.map((a: any) => a.created_by).filter(Boolean))];

    const [sellers, employees] = await Promise.all([
      CrmSellers.findAll({ where: { lead_id: leadIds }, raw: true }),
      CrmEmployees.findAll({
        where: {
          [Op.or]: [
            sequelize.where(sequelize.cast(sequelize.col('id'), 'varchar'), { [Op.in]: employeeIds.map(String) }),
            { user_id: { [Op.in]: employeeIds.filter((id): id is string | number => id !== null && id !== undefined && /^\d+$/.test(String(id))).map(Number) } }
          ]
        },
        raw: true
      }),
    ]);

    const employeesMap = new Map();
    employees.forEach((e: any) => {
        const name = `${e.first_name || ""} ${e.last_name || ""}`.trim();
        if (e.id) employeesMap.set(String(e.id), name);
        if (e.user_id) employeesMap.set(String(e.user_id), name);
    });

    const sellersMap = new Map(sellers.map((s: any) => [s.lead_id, Object.assign({}, s)]));

    const items = rawActivities.map((activity: any) => {
      const seller = sellersMap.get(activity.lead_id) || {};
      const leadName = `${seller.first_name || ""} ${seller.last_name || ""}`.trim() || "Unknown Lead";

      let typeName = "note";
      if (activity.activity_type_id === 1) typeName = "call";
      if (activity.activity_type_id === 2) typeName = "sms";
      if (activity.activity_type_id === 3) typeName = "email";
      
      return {
        id: activity.id.toString(),
        employee_id: activity.created_by?.toString() || null,
        employee_name: employeesMap.get(String(activity.created_by)) || "Unknown",
        type: typeName,
        description: activity.notes || "Activity recorded",
        lead_id: activity.lead_id,
        lead_name: leadName,
        timestamp: activity.created_at ? new Date(activity.created_at).toISOString() : null,
      };
    });

    return {
      items,
      totalCount: count,
    };
  }

  static async getAtRiskLeads(limit: number) {
    // Definition of At Risk: 
    // result contains "bad", "rejected", "blocked" OR last_updated < 5 days ago
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 5);

    const staleLeads = await CrmLeads.findAll({
      where: {
        stage_id: { [Op.not]: null }, // Ensure it has a stage
        [Op.or]: [
          { last_updated: { [Op.lt]: staleDate } },
          { result: { [Op.in]: ["stale", "bad_result", "blocked", "rejected"] } },
        ]
      },
      order: [["last_updated", "ASC"]],
      limit: limit || 20,
      raw: true,
    });

    if (staleLeads.length === 0) return [];

    const leadIds = staleLeads.map((l: any) => l.id);
    const advisorIds = staleLeads.map((l: any) => l.seller_advisor_id).filter(Boolean);
    const stageIds = staleLeads.map((l: any) => l.stage_id).filter(Boolean);

    const [sellers, employees, stages] = await Promise.all([
      CrmSellers.findAll({ where: { lead_id: leadIds }, raw: true }),
      CrmEmployees.findAll({
        where: {
          [Op.or]: [
            sequelize.where(sequelize.cast(sequelize.col('id'), 'varchar'), { [Op.in]: advisorIds.map(String) }),
            { user_id: { [Op.in]: advisorIds.filter((id): id is string | number => id !== null && id !== undefined && /^\d+$/.test(String(id))).map(Number) } }
          ]
        },
        raw: true
      }),
      CrmStages.findAll({ where: { id: stageIds }, raw: true })
    ]);

    const sellersMap = new Map(sellers.map((s: any) => [s.lead_id, s]));
    const employeesMap = new Map();
    employees.forEach((e: any) => {
        const name = `${e.first_name || ""} ${e.last_name || ""}`.trim();
        if (e.id) employeesMap.set(String(e.id), name);
        if (e.user_id) employeesMap.set(String(e.user_id), name);
    });
    const stagesMap = new Map(stages.map((s: any) => [s.id, s]));

    return staleLeads.map((lead: any) => {
      const seller = sellersMap.get(lead.id) || {};
      const advisor = employeesMap.get(lead.seller_advisor_id) || {};
      const stage = stagesMap.get(lead.stage_id) || {};

      let reason = "stale";
      if (lead.result && ["bad_result", "blocked", "rejected"].includes(lead.result)) {
        reason = lead.result;
      }

      return {
        id: lead.id,
        lead_name: `${seller.first_name || ""} ${seller.last_name || ""}`.trim() || "Unknown Lead",
        advisor_name: `${advisor.first_name || ""} ${advisor.last_name || ""}`.trim() || "Unassigned",
        stage_name: stage.name || "Unknown Stage",
        days_in_stage: lead.days_in_current_stage || 0,
        result: lead.result || "none",
        last_updated: lead.last_updated ? new Date(lead.last_updated).toISOString() : null,
        reason: reason,
      };
    });
  }
}
