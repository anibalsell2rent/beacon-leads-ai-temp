import { LeadsService } from './leads.service';

export class WorkflowEngine {
 
  static async processEvent(eventName: string, payload: any): Promise<void> {
    const { leadId } = payload;
    
    if (!leadId) {
      console.warn(`[WorkflowEngine] Ignored event ${eventName}: missing leadId in payload.`);
      return;
    }

    console.log(`[WorkflowEngine] Processing event: '${eventName}' for lead: ${leadId}`);

    try {
      // 1. HARDCODED BUSINESS RULES (Lead Status Evaluation)
      // Since any of these events can affect the Lead stage pipeline, we evaluate it.
      await LeadsService.evaluateLeadStatus(leadId);

      // 2. DYNAMIC WORKFLOWS (From DB - Future Implementation)
      // Here we will query the `crm_workflows` table to find active workflows 
      // where `trigger_event` matches the `eventName`.
      
      // const activeWorkflows = await this.getWorkflowsByTrigger(eventName);
      // for(const wf of activeWorkflows) {
      //    await this.executeWorkflowSteps(wf.id, leadId, payload);
      // }

    } catch (error) {
      console.error(`[WorkflowEngine] Error processing event '${eventName}' for lead ${leadId}:`, error);
    }
  }

  /*
  private static async getWorkflowsByTrigger(triggerEvent: string) {
    // SELECT * FROM crm_workflows WHERE trigger_event = triggerEvent AND active = true;
    return [];
  }

  private static async executeWorkflowSteps(workflowId: string, leadId: string, payload: any) {
    // SELECT * FROM crm_workflow_steps WHERE workflow_id = workflowId ORDER BY step_order ASC;
    // Iterate and execute actions (e.g., Send SMS, Send Email, Create Task)
  }
  */
}
