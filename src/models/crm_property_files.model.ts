import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmPropertyFiles extends Model {
  public id!: number;
  public property_id!: string;
  public file_id!: number;
}

CrmPropertyFiles.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    property_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    file_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "crm_property_files",
    timestamps: false,
  }
);
