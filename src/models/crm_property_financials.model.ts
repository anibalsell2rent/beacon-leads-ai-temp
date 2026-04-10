import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmPropertyFinancials extends Model {
  public id!: number;
  public property_id!: string;
  public arv!: number;
  public rehab_estimate!: number;
  public mao!: number;
  public estimated_rent!: number;
  public created_at!: Date;
  public mtg_remaining_balance!: number;
  public mtg_monthly_payment!: number;
  public second_mtg_balance!: number;
  public second_mtg_monthly_payment!: number;
  public interest_rate!: number;
  public va_fha_mortgage!: string;
  public batch_data_mtg!: string;
  public home_insurance_yearly!: number;
  public taxes_per_year!: number;
  public tax_debt!: number;
  public financed_solar_balance!: number;
  public solar_monthly_payment!: number;
  public hei_in_place!: boolean;
  public home_equity_investor_info!: string;
  public other_liens!: string;
  public debt_total!: number;
  public total_payoff_value!: number;
  public is_in_foreclosure!: boolean;
  public estimated_foreclosure_date!: Date;
  public foreclosure_attorney!: string;
  public block_foreclosure!: string;
  public updated_at!: Date;
}

CrmPropertyFinancials.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    property_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    arv: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    rehab_estimate: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    mao: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    estimated_rent: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    mtg_remaining_balance: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    mtg_monthly_payment: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    second_mtg_balance: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    second_mtg_monthly_payment: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    interest_rate: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    va_fha_mortgage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    batch_data_mtg: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    home_insurance_yearly: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    taxes_per_year: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    tax_debt: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    financed_solar_balance: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    solar_monthly_payment: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    hei_in_place: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    home_equity_investor_info: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    other_liens: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    debt_total: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    total_payoff_value: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    is_in_foreclosure: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    estimated_foreclosure_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    foreclosure_attorney: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    block_foreclosure: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "crm_property_financials",
    timestamps: false,
  }
);
