import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";
import { executeStageWorkflow } from "../services/workflow.service";

export class CrmLeads extends Model {
  public id!: string;
  public lead_number!: number;
  public property_id!: string;
  public stage_id!: string;
  public previous_stage_id!: string;
  public result!: string;
  public pipeline_type!: string;
  public is_hot!: boolean;
  public lead_score!: number;
  public seller_subscore!: number;
  public property_subscore!: number;
  public transaction_subscore!: number;
  public investor_subscore!: number;
  public lead_initial_score!: number;
  public lead_final_score!: number;
  public s2r_net_revenue!: number;
  public contract_price!: number;
  public cap_rate!: number;
  public sellers_gross_equity!: number;
  public marketing_source!: string;
  public campaign_medium!: string;
  public campaign_name!: string;
  public where_did_you_hear!: string;
  public referral_source!: string;
  public referral_name!: string;
  public seller_advisor_id!: string;
  public seller_manager_id!: string;
  public investor_advisor_id!: string;
  public cold_outreach_specialist_id!: string;
  public transaction_coordinator_id!: string;
  public lead_notes!: string;
  public seller_segment!: string;
  public reason_for_failure!: string;
  public past_reason_for_failure!: string;
  public date_created!: Date;
  public last_updated!: Date;
  public last_contact_date!: Date;
  public follow_up_date!: Date;
  public days_in_current_stage!: number;
  public total_days_in_pipeline!: number;
  public stage_entered_at!: Date;
  public revival_attempt_date!: Date;
  public revived_campaign_content!: string;
  public scheduled_meeting_date!: Date;
  public scheduled_booking_date!: Date;
  public re_booking_scheduled_date!: Date;
  public pippin_status!: string;
  public pippin_order_id!: string;
  public pippin_order_tracking_url!: string;
  public pippin_100_payment!: boolean;
  public pippin_60_payment!: boolean;
  public tags!: any;
  public custom_fields!: any;
  public created_at!: Date;
  public updated_at!: Date;
  public zoho_lead_id!: string;
  public marketing_source_id!: number;
  public campaign_medium_id!: number;
  public owner_id!: string;
}

CrmLeads.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    lead_number: {
      type: DataTypes.INTEGER,
      unique: true,
      autoIncrement: true,
      allowNull: true,  // DB sequence assigns this — Sequelize must not validate it as required
    },

    property_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    stage_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    previous_stage_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    result: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pipeline_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_hot: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    lead_score: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    seller_subscore: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    property_subscore: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    transaction_subscore: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    investor_subscore: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    lead_initial_score: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    lead_final_score: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    s2r_net_revenue: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    contract_price: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    cap_rate: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    sellers_gross_equity: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    marketing_source: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    campaign_medium: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    campaign_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    where_did_you_hear: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    referral_source: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    referral_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    seller_advisor_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    seller_manager_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    investor_advisor_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cold_outreach_specialist_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    transaction_coordinator_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lead_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    seller_segment: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reason_for_failure: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    past_reason_for_failure: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    date_created: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_updated: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_contact_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    follow_up_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    days_in_current_stage: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    total_days_in_pipeline: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    stage_entered_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    revival_attempt_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    revived_campaign_content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    scheduled_meeting_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    scheduled_booking_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    re_booking_scheduled_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    pippin_status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pippin_order_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pippin_order_tracking_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    pippin_100_payment: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    pippin_60_payment: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    tags: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    custom_fields: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    zoho_lead_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    marketing_source_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    campaign_medium_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    owner_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "crm_leads",
    timestamps: false,
    hooks: {
      afterCreate: async (lead, options) => {
        if (lead.stage_id) {
          executeStageWorkflow(lead.id, lead.stage_id, 'LEAD').catch(err => console.error(err));
        }
      },
      afterUpdate: async (lead, options) => {
        if (lead.changed('stage_id') && lead.stage_id) {
          executeStageWorkflow(lead.id, lead.stage_id, 'LEAD').catch(err => console.error(err));
        }
      }
    }
  }
);
