import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmActivities extends Model {
  public id!: number;
  public property_id!: string;
  public lead_id!: string;
  public activity_type_id!: number;
  public notes!: string;
  public due_date!: Date;
  public created_by!: number;
  public created_at!: Date;
  public zoho_id!: string;
  public seller_id!: number;
}

CrmActivities.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    property_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lead_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    activity_type_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    zoho_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    seller_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "crm_activities",
    timestamps: false,
  }
);
