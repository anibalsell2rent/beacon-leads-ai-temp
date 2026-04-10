import { CrmLeads } from "../models/crm_leads.model";
import { CrmDeals } from "../models/crm_deals.model";
import { CrmStages } from "../models/crm_stages.model";
import { CrmEmployees } from "../models/crm_employees.model";
import { CrmSellers } from "../models/crm_sellers.model";
import { Property } from "../models/property.model";
import { Op } from "sequelize";

// Days target per stage (default targets if not stored in DB)
const LEAD_STAGE_DAYS: Record<string, number> = {
    "New Lead": 3,
    "Initial Booking": 5,
    "Initial Underwriting": 8,
    "Propose to Seller": 4,
    "PSA Execution": 12,
    "Analyze & Qualify": 5,
};

const DEAL_STAGE_DAYS: Record<string, number> = {
    "Searching for Investors": 10,
    "Contract Assigned": 10,
    "Inspection Period": 7,
    "Closing": 7,
    "Closed Won": 0,
};

// Role map for stages
const LEAD_STAGE_ROLES: Record<string, string> = {
    "New Lead": "Seller Advisor",
    "Initial Booking": "Seller Advisor",
    "Initial Underwriting": "Seller Manager",
    "Propose to Seller": "Seller Manager",
    "PSA Execution": "Seller Manager",
    "Analyze & Qualify": "Seller Manager",
};

const DEAL_STAGE_ROLES: Record<string, string> = {
    "Searching for Investors": "Investor Advisor",
    "Contract Assigned": "Transaction Coordinator",
    "Inspection Period": "Transaction Coordinator",
    "Closing": "Transaction Coordinator",
    "Closed Won": "Transaction Coordinator",
};

export class PipelineProgressService {
    static async getPipelineProgress(leadId: string) {
        if (!leadId) throw new Error("Lead ID is required");

        // 1. Fetch lead
        const lead = await CrmLeads.findByPk(leadId, { raw: true }) as any;
        if (!lead) throw new Error("Lead not found");

        // 2. Fetch all data in parallel
        const [allStages, deal, seller, property, employees] = await Promise.all([
            CrmStages.findAll({ order: [["position", "ASC"]], raw: true }),
            CrmDeals.findOne({ where: { lead_id: leadId }, raw: true }),
            CrmSellers.findOne({ where: { lead_id: leadId }, raw: true }),
            lead.property_id ? Property.findByPk(lead.property_id, { raw: true }) : Promise.resolve(null),
            CrmEmployees.findAll({
                where: {
                    id: {
                        [Op.in]: [
                            lead.seller_advisor_id,
                            lead.seller_manager_id,
                            lead.investor_advisor_id,
                            lead.transaction_coordinator_id,
                        ].filter(Boolean),
                    },
                },
                raw: true,
            }),
        ]);

        const empMap = new Map((employees as any[]).map((e) => [e.id, e]));

        const advisor: any = lead.seller_advisor_id ? empMap.get(lead.seller_advisor_id) : null;
        const manager: any = lead.seller_manager_id ? empMap.get(lead.seller_manager_id) : null;
        const investorAdvisor: any = lead.investor_advisor_id ? empMap.get(lead.investor_advisor_id) : null;
        const tc: any = (deal as any)?.transaction_coordinator_id
            ? empMap.get((deal as any).transaction_coordinator_id)
            : null;

        const getEmpName = (emp: any) =>
            emp ? `${emp.first_name || ""} ${emp.last_name || ""}`.trim() : null;

        // ─── LEADS PIPELINE ──────────────────────────────────────────────────────
        const leadStages = (allStages as any[]).filter(
            (s) => s.stage_type === "lead" || s.stage_type === "LEAD"
        );

        const leadsStageProgress = leadStages.map((stage: any) => {
            const isCurrent = stage.id === lead.stage_id;
            const isCompleted = stage.position < (leadStages.find((s: any) => s.id === lead.stage_id)?.position ?? 0);
            const roleName = LEAD_STAGE_ROLES[stage.name] || "Seller Advisor";
            const empForRole = roleName.toLowerCase().includes("manager") ? manager : advisor;
            return {
                stage_id: stage.id,
                stage_name: stage.name,
                position: stage.position,
                is_current: isCurrent,
                is_completed: isCompleted,
                days_target: LEAD_STAGE_DAYS[stage.name] ?? 5,
                days_spent: isCurrent ? (lead.days_in_current_stage ?? 0) : null,
                team_member: getEmpName(empForRole),
                team_role: roleName,
            };
        });

        // Field-based task checks per stage for leads
        const leadTaskChecks = buildLeadTaskChecks(lead, seller as any, property as any);

        const leadTasksDone = leadTaskChecks.reduce((acc: number, check: any) => acc + (check.is_done ? 1 : 0), 0);
        const leadsCurrentStagePos = leadStages.find((s: any) => s.id === lead.stage_id)?.position ?? 0;
        const leadsTotalStages = leadStages.length || 1;
        const leadsProgressPct = Math.round((leadsCurrentStagePos / leadsTotalStages) * 100);
        const leadDaysTotal = lead.total_days_in_pipeline ?? lead.days_in_current_stage ?? 0;
        const leadStatus = (lead.days_in_current_stage ?? 0) > (LEAD_STAGE_DAYS[leadStages.find((s: any) => s.id === lead.stage_id)?.name] ?? 5) ? "At Risk" : "On Track";

        // ─── DEALS PIPELINE ──────────────────────────────────────────────────────
        let dealsPipeline = null;

        if (deal) {
            const d = deal as any;
            const dealStages = (allStages as any[]).filter(
                (s) => s.stage_type === "deal" || s.stage_type === "DEAL"
            );

            const dealStageProgress = dealStages.map((stage: any) => {
                const isCurrent = stage.id === d.stage_id;
                const isCompleted = stage.position < (dealStages.find((s: any) => s.id === d.stage_id)?.position ?? 0);
                const roleName = DEAL_STAGE_ROLES[stage.name] || "Transaction Coordinator";
                const empForRole = roleName.toLowerCase().includes("investor") ? investorAdvisor : tc;
                return {
                    stage_id: stage.id,
                    stage_name: stage.name,
                    position: stage.position,
                    is_current: isCurrent,
                    is_completed: isCompleted,
                    days_target: DEAL_STAGE_DAYS[stage.name] ?? 7,
                    days_spent: isCurrent ? (d.days_in_current_stage ?? 0) : null,
                    team_member: getEmpName(empForRole),
                    team_role: roleName,
                };
            });

            const dealTaskChecks = buildDealTaskChecks(d);
            const dealTasksDone = dealTaskChecks.reduce((acc: number, check: any) => acc + (check.is_done ? 1 : 0), 0);
            const dealCurrentPos = dealStages.find((s: any) => s.id === d.stage_id)?.position ?? 0;
            const dealTotalStages = dealStages.length || 1;
            const dealProgressPct = Math.round((dealCurrentPos / dealTotalStages) * 100);
            const dealDaysTotal = d.days_in_current_stage ?? 0;
            const dealCurrentStageName = dealStages.find((s: any) => s.id === d.stage_id)?.name;
            const dealStatus = (d.days_in_current_stage ?? 0) > (DEAL_STAGE_DAYS[dealCurrentStageName] ?? 7) ? "At Risk" : "On Track";

            dealsPipeline = {
                pipeline_type: "deals",
                status: dealStatus,
                total_days: dealDaysTotal,
                progress_pct: dealProgressPct,
                tasks_done: dealTasksDone,
                tasks_total: dealTaskChecks.length,
                current_stage_id: d.stage_id,
                current_stage_name: dealCurrentStageName,
                stages: dealStageProgress,
                stage_details: dealStages.map((stage: any) => {
                    const roleName = DEAL_STAGE_ROLES[stage.name] || "Transaction Coordinator";
                    const empForRole = roleName.toLowerCase().includes("investor") ? investorAdvisor : tc;
                    const stageChecks = dealTaskChecks.filter((c: any) => c.stage === stage.name);
                    return {
                        stage_id: stage.id,
                        stage_name: stage.name,
                        status: stage.id === d.stage_id ? d.status : (stage.position < dealCurrentPos ? "Completed" : "Pending"),
                        progress_pct: stageChecks.length > 0 ? Math.round((stageChecks.filter((c: any) => c.is_done).length / stageChecks.length) * 100) : null,
                        tasks_done: stageChecks.filter((c: any) => c.is_done).length,
                        tasks_total: stageChecks.length,
                        days_target: DEAL_STAGE_DAYS[stage.name] ?? 7,
                        team_member: getEmpName(empForRole),
                        team_role: roleName,
                        checks: stageChecks,
                    };
                }),
            };
        }

        return {
            lead_id: leadId,
            leads_pipeline: {
                pipeline_type: "leads",
                status: leadStatus,
                total_days: leadDaysTotal,
                progress_pct: leadsProgressPct,
                tasks_done: leadTasksDone,
                tasks_total: leadTaskChecks.length,
                current_stage_id: lead.stage_id,
                current_stage_name: leadStages.find((s: any) => s.id === lead.stage_id)?.name,
                stages: leadsStageProgress,
                stage_details: leadStages.map((stage: any) => {
                    const roleName = LEAD_STAGE_ROLES[stage.name] || "Seller Advisor";
                    const empForRole = roleName.toLowerCase().includes("manager") ? manager : advisor;
                    const stageChecks = leadTaskChecks.filter((c: any) => c.stage === stage.name);
                    const currentStagePos = leadsStageProgress.find((s: any) => s.stage_id === lead.stage_id)?.position ?? 0;
                    return {
                        stage_id: stage.id,
                        stage_name: stage.name,
                        status: stage.id === lead.stage_id ? leadStatus : (stage.position < currentStagePos ? "Completed" : "Pending"),
                        progress_pct: stageChecks.length > 0 ? Math.round((stageChecks.filter((c: any) => c.is_done).length / stageChecks.length) * 100) : null,
                        tasks_done: stageChecks.filter((c: any) => c.is_done).length,
                        tasks_total: stageChecks.length,
                        days_target: LEAD_STAGE_DAYS[stage.name] ?? 5,
                        team_member: getEmpName(empForRole),
                        team_role: roleName,
                        checks: stageChecks,
                    };
                }),
            },
            deals_pipeline: dealsPipeline,
        };
    }
}

// ─── HELPER: Lead field-based task checks ────────────────────────────────────
function buildLeadTaskChecks(lead: any, seller: any, property: any) {
    return [
        // New Lead
        { stage: "New Lead", label: "Verify lead contact info", is_done: !!(seller?.phone || seller?.email), team_role: "Seller Advisor" },
        { stage: "New Lead", label: "Initial outreach attempt", is_done: !!lead.last_contact_date, team_role: "Seller Advisor" },
        { stage: "New Lead", label: "Log lead source and campaign", is_done: !!(lead.marketing_source || lead.campaign_name), team_role: "Seller Advisor" },

        // Initial Booking
        { stage: "Initial Booking", label: "Schedule initial booking call", is_done: !!lead.scheduled_booking_date, team_role: "Seller Advisor" },
        { stage: "Initial Booking", label: "Confirm appointment with seller", is_done: !!lead.scheduled_meeting_date, team_role: "Seller Advisor" },
        { stage: "Initial Booking", label: "Prepare pre-call property research", is_done: !!(property?.address || property?.bedrooms), team_role: "Seller Advisor" },

        // Initial Underwriting
        { stage: "Initial Underwriting", label: "Run initial property valuation", is_done: !!(property?.price || property?.cap_rate), team_role: "Seller Manager" },
        { stage: "Initial Underwriting", label: "Review property condition notes", is_done: !!(property?.overall_condition || property?.what_are_the_repairs_required), team_role: "Seller Manager" },
        { stage: "Initial Underwriting", label: "Verify tax and lien status", is_done: !!(property?.taxes_per_year || property?.folio_number_apn), team_role: "Seller Manager" },
        { stage: "Initial Underwriting", label: "Determine deal viability", is_done: !!(lead.lead_score && lead.lead_score > 0), team_role: "Seller Manager" },

        // Propose to Seller
        { stage: "Propose to Seller", label: "Prepare offer package", is_done: !!(lead.contract_price), team_role: "Seller Advisor" },
        { stage: "Propose to Seller", label: "Present offer to seller", is_done: !!lead.offer_presented_date, team_role: "Seller Advisor" },
        { stage: "Propose to Seller", label: "Handle seller objections", is_done: !!(lead.lead_notes && lead.lead_notes.includes("objection")), team_role: "Seller Advisor" },
        { stage: "Propose to Seller", label: "Log offer outcome", is_done: !!(lead.stage_id !== lead.previous_stage_id && lead.stage_id), team_role: "Seller Advisor" },

        // PSA Execution
        { stage: "PSA Execution", label: "Draft PSA document", is_done: !!(lead.pippin_order_id), team_role: "Seller Manager" },
        { stage: "PSA Execution", label: "Send PSA for seller signature", is_done: !!(lead.pippin_status), team_role: "Seller Manager" },
        { stage: "PSA Execution", label: "Collect signed PSA", is_done: lead.pippin_status === "completed", team_role: "Seller Manager" },
        { stage: "PSA Execution", label: "Verify PSA terms match offer", is_done: lead.pippin_status === "completed", team_role: "Seller Manager" },

        // Analyze & Qualify
        { stage: "Analyze & Qualify", label: "Request Title Pre Check", is_done: !!(lead.pippin_order_tracking_url), team_role: "Seller Manager" },
        { stage: "Analyze & Qualify", label: "Request Documents from seller", is_done: false, team_role: "Seller Manager" },
        { stage: "Analyze & Qualify", label: "Request Payoffs", is_done: false, team_role: "Seller Manager" },
        { stage: "Analyze & Qualify", label: "Request ID Verification", is_done: seller?.idenfy_status === "Verified", team_role: "Seller Manager" },
        { stage: "Analyze & Qualify", label: "Final Underwriting Checklist", is_done: !!(lead.lead_final_score && lead.lead_final_score > 0), team_role: "Seller Manager" },
        { stage: "Analyze & Qualify", label: "Approve for Deal conversion", is_done: lead.result === "Converted", team_role: "Seller Manager" },
    ];
}

// ─── HELPER: Deal field-based task checks ────────────────────────────────────
function buildDealTaskChecks(deal: any) {
    return [
        // Searching for Investors
        { stage: "Searching for Investors", label: "List property on marketplace", is_done: deal.view_on_marketplace === true, team_role: "Investor Advisor" },
        { stage: "Searching for Investors", label: "Identify top investor matches", is_done: !!(deal.offer_presented_date), team_role: "Investor Advisor" },
        { stage: "Searching for Investors", label: "Conduct investor outreach", is_done: !!(deal.investor_score_crm), team_role: "Investor Advisor" },
        { stage: "Searching for Investors", label: "Schedule investor walkthroughs", is_done: !!(deal.last_note && deal.last_note.includes("walkthrough")), team_role: "Investor Advisor" },
        { stage: "Searching for Investors", label: "Collect investor offers", is_done: !!(deal.offer_value), team_role: "Investor Advisor" },

        // Contract Assigned
        { stage: "Contract Assigned", label: "TC File Audit", is_done: !!(deal.contract_assigned_date), team_role: "Transaction Coordinator" },
        { stage: "Contract Assigned", label: "Internal Deal Kickoff Meeting", is_done: !!(deal.investor_advisor_id), team_role: "Transaction Coordinator" },
        { stage: "Contract Assigned", label: "Review PSA", is_done: !!(deal.psa_value), team_role: "Transaction Coordinator" },
        { stage: "Contract Assigned", label: "Engage Title Company", is_done: !!(deal.noc_recorded_date), team_role: "Transaction Coordinator" },
        { stage: "Contract Assigned", label: "Order appraisal", is_done: !!(deal.investor_score_base), team_role: "Transaction Coordinator" },

        // Inspection Period
        { stage: "Inspection Period", label: "Schedule property inspection", is_done: !!(deal.inspection_period_exp_date), team_role: "Transaction Coordinator" },
        { stage: "Inspection Period", label: "Review inspection report", is_done: !!(deal.inspection_period_exp_date), team_role: "Transaction Coordinator" },
        { stage: "Inspection Period", label: "Negotiate repairs if needed", is_done: !!(deal.discount_to_market_pct), team_role: "Transaction Coordinator" },
        { stage: "Inspection Period", label: "Investor inspection sign-off", is_done: !!(deal.emd_received_date), team_role: "Investor Advisor" },

        // Closing
        { stage: "Closing", label: "Review title commitment", is_done: !!(deal.estimated_closing_date), team_role: "Transaction Coordinator" },
        { stage: "Closing", label: "Coordinate closing date", is_done: !!(deal.estimated_closing_date), team_role: "Transaction Coordinator" },
        { stage: "Closing", label: "Review closing disclosure", is_done: !!(deal.actual_closing_date), team_role: "Transaction Coordinator" },
        { stage: "Closing", label: "Collect pre-closing signatures", is_done: !!(deal.noc_recorded_date), team_role: "Transaction Coordinator" },
        { stage: "Closing", label: "Wire transfer confirmation", is_done: !!(deal.actual_closing_date), team_role: "Transaction Coordinator" },
        { stage: "Closing", label: "Final walkthrough", is_done: !!(deal.actual_closing_date), team_role: "Investor Advisor" },

        // Closed Won
        { stage: "Closed Won", label: "Record closing in system", is_done: !!(deal.actual_closing_date), team_role: "Transaction Coordinator" },
        { stage: "Closed Won", label: "Send closing celebration notice", is_done: deal.status === "Closed Won", team_role: "Transaction Coordinator" },
        { stage: "Closed Won", label: "Archive deal documents", is_done: deal.status === "Closed Won", team_role: "Transaction Coordinator" },
    ];
}
