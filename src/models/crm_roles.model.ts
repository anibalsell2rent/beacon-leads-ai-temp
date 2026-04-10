import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmRoles extends Model {
  public id!: number;
  public name!: string;
}

CrmRoles.init(
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
    tableName: "crm_roles",
    timestamps: false,
  }
);
