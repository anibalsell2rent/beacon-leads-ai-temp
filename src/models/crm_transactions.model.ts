import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmTransactions extends Model {
  public id!: number;
  public property_id!: string;
  public investor_id!: number;
  public price!: number;
  public closed_at!: Date;
}

CrmTransactions.init(
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
    price: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    closed_at: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "crm_transactions",
    timestamps: false,
  }
);
