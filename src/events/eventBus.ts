import { EventEmitter } from 'events';
import { WorkflowEngine } from '../services/workflowEngine.service';

/**
 * Centralized Event Bus for the entire Backend application.
 */
export const eventBus = new EventEmitter();

/**
 * System Events Catalog.
 * These same strings will map directly to the `trigger_event` column in `crm_workflows` 
 * to support dynamic, database-driven workflows in the future.
 */
export const SYSTEM_EVENTS = {
  // Lead-specific events that trigger a status check
  LEAD_CREATED: 'lead.created',
  LEAD_UPDATED: 'lead.updated',
  CONTACT_ATTEMPT_ADDED: 'lead.contact_attempt_added',
  ACTIVITY_SCHEDULED: 'lead.activity_scheduled',
  TRANSACTION_CREATED: 'lead.transaction_created',
  
  // Future resultant events
  LEAD_STATUS_CHANGED: 'lead.status_changed'
} as const;

// Extract values for type safety
type SystemEvent = typeof SYSTEM_EVENTS[keyof typeof SYSTEM_EVENTS];

/**
 * BINDING THE EVENT BUS TO THE WORKFLOW ENGINE
 * We listen to ALL registered system events and forward them to the orchestrator.
 */
Object.values(SYSTEM_EVENTS).forEach((eventName) => {
  eventBus.on(eventName, async (payload) => {
    // Process the event using the Central Engine
    await WorkflowEngine.processEvent(eventName, payload);
  });
});

export { SystemEvent };
