import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmActivityTypes extends Model {
  public id!: number;
  public name!: string;
}

CrmActivityTypes.init(
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
    tableName: "crm_activity_types",
    timestamps: false,
  }
);
