import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmRoofTypes extends Model {
  public id!: number;
  public name!: string;
}

CrmRoofTypes.init(
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
    tableName: "crm_roof_types",
    timestamps: false,
  }
);
