import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmPropertyComps extends Model {
  public id!: string;
  public property_id!: string;
  public comp_address!: string;
  public comp_price!: number;
  public comp_sqft!: number;
  public comp_beds!: number;
  public comp_baths!: number;
  public comp_distance!: number;
  public created_at!: Date;
}

CrmPropertyComps.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    property_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    comp_address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    comp_price: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    comp_sqft: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    comp_beds: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    comp_baths: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    comp_distance: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "crm_property_comps",
    timestamps: false,
  }
);
