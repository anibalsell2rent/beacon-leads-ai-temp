import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmOfferStatus extends Model {
  public id!: number;
  public name!: string;
}

CrmOfferStatus.init(
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
    tableName: "crm_offer_status",
    timestamps: false,
  }
);
