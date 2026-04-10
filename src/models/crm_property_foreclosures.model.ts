import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmPropertyForeclosures extends Model {
  public id!: string;
  public property_id!: string;
  public foreclosure_status!: string;
  public estimated_sale_date!: Date;
  public foreclosure_attorney!: string;
  public block_foreclosure_method!: string;
  public created_at!: Date;
}

CrmPropertyForeclosures.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    property_id: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    foreclosure_status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    estimated_sale_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    foreclosure_attorney: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    block_foreclosure_method: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "crm_property_foreclosures",
    timestamps: false,
  }
);
