-- Add tracking_date to support daily snapshots
ALTER TABLE manager_lead_tracking 
ADD COLUMN tracking_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Drop old unique constraint and create new one with date
ALTER TABLE manager_lead_tracking 
DROP CONSTRAINT IF EXISTS manager_lead_tracking_manager_id_lead_id_tab_key;

ALTER TABLE manager_lead_tracking 
ADD CONSTRAINT manager_lead_tracking_unique_per_day 
UNIQUE(manager_id, lead_id, tab, tracking_date);

-- Add index for date queries
CREATE INDEX idx_manager_lead_tracking_date ON manager_lead_tracking(manager_id, tracking_date);
