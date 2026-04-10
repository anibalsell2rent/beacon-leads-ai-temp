import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmPropertyInvestorOffers extends Model {
  public id!: number;
  public property_id!: string;
  public investor_id!: number;
  public offer_price!: number;
  public offer_date!: Date;
  public status_id!: number;
  public created_by!: number;
  public created_at!: Date;
}

CrmPropertyInvestorOffers.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    property_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    investor_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    offer_price: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    offer_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_by: {
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
    tableName: "crm_property_investor_offers",
    timestamps: false,
  }
);
