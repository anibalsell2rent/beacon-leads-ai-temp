

export class LeadsService {
  
  static async evaluateLeadStatus(leadId: string): Promise<void> {
    try {
      // 1. Fetch current data for the lead
      const lead = await this.getLeadDetails(leadId); 
      const contactAttemptsCount = await this.getContactAttempts(leadId);
      const hasMeeting = await this.hasScheduledMeeting(leadId);
      const latestTransactionStatus = await this.getLatestTransactionStatus(leadId);

      // We'll keep track of the new status name
      let newStatusName = lead.currentStatusName;

      // 2. HIGHEST PRIORITY: Exit Rules (Disqualified / Unsubscribed / Unreachable)
      if (lead.email_opt_out || lead.dnc_do_not_contact) {
        newStatusName = 'Unsubscribed';
      } 
      // Replace lead.property.state with the correct field when you indicate where it is
      else if (lead.propertyState && ['SC', 'IL', 'OK'].includes(lead.propertyState)) {
        newStatusName = 'Disqualified';
      } 
      // Note: Only mark as unreachable if there are no meetings or advanced transactions
      else if (contactAttemptsCount >= 5 && !hasMeeting && !latestTransactionStatus) {
        newStatusName = 'Unreachable';
      } 

      // 3. PIPELINE RULES (From latest stages down to earliest)
      else if (latestTransactionStatus === 'Offer Accepted' || lead.deals_team_approval) {
        newStatusName = 'PSA Execution';
      } 
      else if (latestTransactionStatus === 'Offer Presented') {
        newStatusName = 'Propose to Seller';
      } 
      // Update the threshold correctly if needed, matching SQL stage criteria
      else if (lead.conversion_probability && lead.conversion_probability > 80) {
        newStatusName = 'Underwriting';
      } 
      else if (hasMeeting) {
        newStatusName = 'Initial Booking';
      } 
      else if (contactAttemptsCount > 0) {
        newStatusName = 'Attempted to Contact';
      } 
      else {
        newStatusName = 'New Lead';
      }

      // 4. Update the DB if the status has changed
      if (newStatusName !== lead.currentStatusName) {
        console.log(`[Lead Workflow] Lead ${leadId} status changing from ${lead.currentStatusName} to ${newStatusName}`);
        
        // Fetch the new status UUID from your `crm_lead_statuses` table
        // const statusRecordId = await getLeadStatusIdByName(newStatusName);
        
        // Update the lead's status
        // await updateLeadStatusId(leadId, statusRecordId);

        // Optional: log to `crm_workflow_executions`
        // await logWorkflowExecutionChange(leadId, newStatusName);
      } else {
        console.log(`[Lead Workflow] Lead ${leadId} status remains ${lead.currentStatusName}`);
      }

    } catch (error) {
      console.error(`[Lead Workflow] Error evaluating status for lead ${leadId}:`, error);
      throw error;
    }
  }

  
  private static async getLeadDetails(leadId: string): Promise<any> {
    return {
      id: leadId,
      currentStatusName: 'New Lead',
      conversion_probability: 50,
      email_opt_out: false,
      dnc_do_not_contact: false,
      deals_team_approval: false,
      propertyState: 'FL', 
    };
  }

  private static async getContactAttempts(leadId: string): Promise<number> {
    // SELECT count(*) FROM crm_lead_contacts WHERE lead_id = leadId
    return 0;
  }

  private static async hasScheduledMeeting(leadId: string): Promise<boolean> {
    // SELECT count(*) > 0 FROM crm_activities WHERE lead_id = leadId AND activity_type = 'meeting' AND scheduled_at IS NOT NULL
    return false;
  }

  private static async getLatestTransactionStatus(leadId: string): Promise<string | null> {
    // SELECT status FROM crm_transactions WHERE lead_id = leadId ORDER BY created_at DESC LIMIT 1
    return null;
  }
}
