import { CrmLeads } from "../models/crm_leads.model";
import { CrmDeals } from "../models/crm_deals.model";
import { CrmPropertyInvestorOffers } from "../models/crm_property_investor_offers.model";
import { CrmDocuments } from "../models/crm_documents.model";
import { CrmActivities } from "../models/crm_activities.model";
import { CrmEmployees } from "../models/crm_employees.model";

export class TransactionService {
  static async getTransactionByPropertyId(propertyId: string) {
    if (!propertyId) return null;

    // 1. Determine Lead / Deal and Phase
    let phase = "lead";
    let leadId = null;

    // Fast check: look for active lead
    const lead = await CrmLeads.findOne({
      where: { property_id: propertyId },
      raw: true,
    }) as any;

    if (lead) {
      leadId = lead.id;
    } else {
      // Look for a deal if no lead found (converted)
      const deal = await CrmDeals.findOne({
        where: { property_id: propertyId },
        raw: true,
      }) as any;
      if (deal) {
        leadId = deal.lead_id || deal.id; // deal might not have lead_id mapped perfectly, fallback to deal id so we don't break
        phase = "deal";
      }
    }

    // 2. Fetch all transaction state concurrently mapped by propertyId
    const [rawOffers, rawDocs, rawActivities] = await Promise.all([
      CrmPropertyInvestorOffers.findAll({ where: { property_id: propertyId }, raw: true }),
      CrmDocuments.findAll({ 
        where: { 
          // Assuming documents might be tied to lead_id or property_id. We'll search entity_id
          entity_id: leadId || propertyId 
        }, 
        raw: true 
      }),
      CrmActivities.findAll({ where: { property_id: propertyId }, raw: true })
    ]);

    // 3. Optional: Map Employees for notes authors if we have created_by
    const authorsIds = [...new Set(rawActivities.map((a: any) => a.created_by).filter(Boolean))];
    let authorsMap = new Map();
    if (authorsIds.length > 0) {
      const authors = await CrmEmployees.findAll({ where: { id: authorsIds }, raw: true });
      authorsMap = new Map(authors.map((a: any) => [a.id, a]));
    }

    // 4. Transform data to match frontend requirements
    const offers = rawOffers.map((o: any) => ({
      id: o.id,
      investor_name: o.investor_id ? "Investor " + o.investor_id : null, 
      investor_company: o.investor_company || null, 
      offer_amount: o.offer_price ? parseFloat(o.offer_price) : null,
      offer_type: o.offer_type || null, 
      status: o.status_id === 1 ? "accepted" : "pending", 
      created_at: o.created_at ? new Date(o.created_at).toISOString() : null,
      expiration_date: o.expiration_date ? new Date(o.expiration_date).toISOString() : null,
      terms: o.terms || null,
    }));

    const documents = rawDocs.map((d: any) => ({
      id: d.id,
      name: d.file_name || "Unknown Document",
      category: d.category || null, 
      source: d.source || null,    
      status: d.status || null,  
      uploaded_at: d.created_at ? new Date(d.created_at).toISOString() : null,
      file_url: d.file_url || null,
    }));

    const notes = rawActivities
      // Note: activity_type_id mapping is typically 1 for Note, 2 for Task etc. Default to true for now.
      .filter((a: any) => a.notes && a.notes.trim().length > 0)
      .map((a: any) => {
        const author = authorsMap.get(a.created_by);
        return {
          id: a.id,
          author: author ? `${author.first_name || ""} ${author.last_name || ""}`.trim() : "System",
          content: a.notes,
          created_at: a.created_at ? new Date(a.created_at).toISOString() : null,
        };
      });

    return {
      property_id: propertyId,
      lead_id: leadId,
      phase,
      offers,
      checklist: [], // Default empty for checklist (tracked by workflow executions locally)
      documents,
      notes,
    };
  }

  static async getDealOffers(dealId: string) {
    // 1. Find deal to get property_id
    const deal = await CrmDeals.findByPk(dealId, { raw: true }) as any;
    if (!deal) return [];

    // 2. Fetch offers
    const rawOffers = await CrmPropertyInvestorOffers.findAll({
      where: { property_id: deal.property_id },
      raw: true
    });

    // 3. Map
    return rawOffers.map((o: any) => ({
      id: o.id,
      investor_name: o.investor_id ? "Investor " + o.investor_id : null,
      investor_company: o.investor_company || null,
      offer_amount: o.offer_price ? parseFloat(o.offer_price) : null,
      offer_type: o.offer_type || null,
      status: o.status_id === 1 ? "accepted" : (o.status_id === 2 ? "rejected" : "pending"),
      created_at: o.created_at ? new Date(o.created_at).toISOString() : null,
      expiration_date: o.expiration_date ? new Date(o.expiration_date).toISOString() : null,
      terms: o.terms || null,
    }));
  }

  static async getMatchedInvestors(dealId: string) {
    // Placeholder - For now return empty or linked investors if any
    return [];
  }

  static async getTransactionChecklist(dealId: string) {
    const deal = await CrmDeals.findByPk(dealId, { raw: true }) as any;
    if (!deal) return [];

    // Map Deal Dates to Checklist Items
    const steps = [
      { id: 'psa_execution', label: 'PSA Execution', date: deal.psa_execution_date },
      { id: 'emd_received', label: 'EMD Received', date: deal.emd_received_date },
      { id: 'inspection_period', label: 'Inspection Period', date: deal.inspection_period_exp_date },
      { id: 'contract_assigned', label: 'Contract Assigned', date: deal.contract_assigned_date },
      { id: 'noc_recorded', label: 'NOC Recorded', date: deal.noc_recorded_date },
      { id: 'closing', label: 'Closing', date: deal.actual_closing_date || deal.estimated_closing_date },
    ];

    return steps.map(step => ({
      step_id: step.id,
      completed: !!step.date,
      completed_at: step.date ? new Date(step.date).toISOString() : null,
      completed_by: "System"
    }));
  }
}
