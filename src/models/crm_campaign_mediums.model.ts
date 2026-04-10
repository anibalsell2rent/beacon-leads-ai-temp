import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmCampaignMediums extends Model {
  public id!: number;
  public name!: string;
}

CrmCampaignMediums.init(
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
    tableName: "crm_campaign_mediums",
    timestamps: false,
  }
);
