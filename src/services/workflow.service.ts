import { CrmWorkflowRules } from '../models/crm_workflow_rules.model';
import { CrmWorkflowExecutions } from '../models/crm_workflow_executions.model';

/**
 * Evaluates and executes any active workflow rules associated with a Stage change.
 * This is triggered automatically by Sequelize Hooks on CrmLeads and CrmDeals.
 * 
 * @param entityId The UUID of the lead or deal being modified
 * @param newStageId The new Stage ID the entity has entered
 * @param entityType 'LEAD' | 'DEAL'
 */
export const executeStageWorkflow = async (entityId: string, newStageId: string, entityType: 'LEAD' | 'DEAL') => {
    try {
        // 1. Find all active rules triggered by a STAGE_CHANGE matching the new Stage ID and entityType
        const activeRules = await CrmWorkflowRules.findAll({
            where: {
                is_active: true,
                trigger_event: 'STAGE_CHANGE',
                entity_type: entityType
            },
            raw: true
        });

        // Filter rules natively (accounting for JSONB structures)
        // Expected condition format: { "stage_id": "UUID-HERE" }
        const matchingRules = activeRules.filter(rule => {
            if (!rule.conditions) return false;
            let conditionsObj = rule.conditions;
            if (typeof conditionsObj === 'string') {
                conditionsObj = JSON.parse(conditionsObj);
            }
            return conditionsObj.stage_id === newStageId;
        });

        if (matchingRules.length === 0) {
            return; // No workflows configured for this stage transition
        }

        // 2. Execute matching rules
        for (const rule of matchingRules) {
            let status = 'SUCCESS';

            try {
                // Parse actions (e.g. { "type": "send_email", "template": "welcome" })
                let actionsObj = rule.actions;
                if (typeof actionsObj === 'string') {
                    actionsObj = JSON.parse(actionsObj);
                }

                console.log(`[WORKFLOW] Triggering Rule '${rule.name}' for ${entityType} ${entityId}`);

                // TODO: Implement specific action handlers based on actionsObj.type
                // example: if (actionsObj.type === 'send_email') sendEmail(entityId, actionsObj.template);

                // Simulating action execution
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (actionError) {
                console.error(`[WORKFLOW ERROR] Failed executing rule '${rule.name}':`, actionError);
                status = 'FAILED';
            }

            // 3. Log the Execution securely
            await CrmWorkflowExecutions.create({
                workflow_id: rule.id,
                entity_id: entityId,
                status: status,
                executed_at: new Date()
            });
        }
    } catch (error) {
        console.error(`[WORKFLOW CRITICAL] Failed to evaluate stage workflows for ${entityType} ${entityId}:`, error);
    }
};
