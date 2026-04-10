import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmFoundationTypes extends Model {
  public id!: number;
  public name!: string;
}

CrmFoundationTypes.init(
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
    tableName: "crm_foundation_types",
    timestamps: false,
  }
);
