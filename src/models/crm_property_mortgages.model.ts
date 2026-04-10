import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmPropertyMortgages extends Model {
  public id!: string;
  public property_id!: string;
  public lender_name!: string;
  public loan_type!: string;
  public loan_balance!: number;
  public monthly_payment!: number;
  public interest_rate!: number;
  public start_date!: Date;
  public maturity_date!: Date;
  public is_primary!: boolean;
  public created_at!: Date;
}

CrmPropertyMortgages.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    property_id: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    lender_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    loan_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    loan_balance: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    monthly_payment: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    interest_rate: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    maturity_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "crm_property_mortgages",
    timestamps: false,
  }
);
