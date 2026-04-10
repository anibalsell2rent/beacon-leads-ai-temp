import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmDealSellers extends Model {
  public id!: number;
  public deal_id!: string;
  public seller_id!: number;
}

CrmDealSellers.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    deal_id: {
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
    tableName: "crm_deal_sellers",
    timestamps: false,
  }
);
