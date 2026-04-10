import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmLeadSellers extends Model {
  public id!: number;
  public lead_id!: string;
  public seller_id!: number;
}

CrmLeadSellers.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    lead_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    seller_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "crm_lead_sellers",
    timestamps: false,
  }
);
