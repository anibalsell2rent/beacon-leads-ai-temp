import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmLeadStatus extends Model {
  public id!: number;
  public name!: string;
}

CrmLeadStatus.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    name: {
      type: DataTypes.TEXT,
      unique: true,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "crm_lead_status",
    timestamps: false,
  }
);
