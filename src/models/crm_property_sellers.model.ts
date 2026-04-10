import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmPropertySellers extends Model {
  public id!: number;
  public property_id!: string;
  public seller_id!: number;
  public is_primary!: boolean;
}

CrmPropertySellers.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    property_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    seller_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "crm_property_sellers",
    timestamps: false,
  }
);
