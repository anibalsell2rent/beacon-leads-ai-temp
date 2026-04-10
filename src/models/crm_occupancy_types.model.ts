import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmOccupancyTypes extends Model {
  public id!: number;
  public name!: string;
}

CrmOccupancyTypes.init(
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
    tableName: "crm_occupancy_types",
    timestamps: false,
  }
);
