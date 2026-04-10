import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmCampaigns extends Model {
  public id!: number;
  public name!: string;
  public source_id!: number;
  public medium_id!: number;
  public created_at!: Date;
}

CrmCampaigns.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    source_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    medium_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "crm_campaigns",
    timestamps: false,
  }
);
