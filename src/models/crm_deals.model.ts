import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";
import { executeStageWorkflow } from "../services/workflow.service";

export class CrmDeals extends Model {
  public id!: string;
  public deal_number!: number;
  public lead_id!: string;
  public stage_id!: string;
  public status!: string;
  public status_label!: string;
  public view_on_marketplace!: boolean;
  public fill_info_status!: string;
  public offer_value!: number;
  public proposed_rent!: number;
  public gross_cap_rate!: number;
  public annual_taxes!: number;
  public insurance_quote!: number;
  public prepaid_rent_value!: number;
  public price_vs_market_value!: number;
  public desired_lease_period!: number;
  public prepaid_months!: number;
  public security_deposit!: number;
  public s2r_estimated_market_value!: number;
  public discount_to_market_pct!: number;
  public psa_value!: number;
  public s2r_rent_value!: number;
  public market_type!: string;
  public investor_score_crm!: number;
  public investor_score_sfr!: number;
  public investor_score_lift!: number;
  public investor_score_base!: number;
  public offer_presented_date!: Date;
  public offer_accepted_date!: Date;
  public psa_execution_date!: Date;
  public psa_expiration_date!: Date;
  public deal_launching_date!: Date;
  public contract_assigned_date!: Date;
  public inspection_period_exp_date!: Date;
  public emd_received_date!: Date;
  public estimated_closing_date!: Date;
  public actual_closing_date!: Date;
  public noc_recorded_date!: Date;
  public seller_advisor_id!: string;
  public investor_advisor_id!: string;
  public transaction_coordinator_id!: string;
  public last_note!: string;
  public days_in_current_stage!: number;
  public stage_entered_at!: Date;
  public tags!: any;
  public created_at!: Date;
  public updated_at!: Date;
  public zoho_deal_id!: string;
  public property_id!: string;
  public owner_id!: string;
}

CrmDeals.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    deal_number: {
      type: DataTypes.INTEGER,
      unique: true,
      allowNull: false,
    },
    lead_id: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    stage_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status_label: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    view_on_marketplace: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    fill_info_status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    offer_value: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    proposed_rent: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    gross_cap_rate: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    annual_taxes: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    insurance_quote: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    prepaid_rent_value: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    price_vs_market_value: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    desired_lease_period: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    prepaid_months: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    security_deposit: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    s2r_estimated_market_value: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    discount_to_market_pct: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    psa_value: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    s2r_rent_value: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    market_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    investor_score_crm: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    investor_score_sfr: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    investor_score_lift: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    investor_score_base: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    offer_presented_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    offer_accepted_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    psa_execution_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    psa_expiration_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    deal_launching_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    contract_assigned_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    inspection_period_exp_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    emd_received_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    estimated_closing_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    actual_closing_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    noc_recorded_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    seller_advisor_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    investor_advisor_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    transaction_coordinator_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    last_note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    days_in_current_stage: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    stage_entered_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    tags: {
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
    zoho_deal_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    property_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    owner_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "crm_deals",
    timestamps: false,
    hooks: {
      afterCreate: async (deal, options) => {
        if (deal.stage_id) {
          executeStageWorkflow(deal.id, deal.stage_id, 'DEAL').catch(err => console.error(err));
        }
      },
      afterUpdate: async (deal, options) => {
        if (deal.changed('stage_id') && deal.stage_id) {
          executeStageWorkflow(deal.id, deal.stage_id, 'DEAL').catch(err => console.error(err));
        }
      }
    }
  }
);
