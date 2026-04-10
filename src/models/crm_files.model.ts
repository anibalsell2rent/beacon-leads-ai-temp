import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmFiles extends Model {
  public id!: number;
  public file_name!: string;
  public file_url!: string;
  public uploaded_by!: number;
  public created_at!: Date;
  public zoho_attachment_id!: string;
}

CrmFiles.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    file_name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    file_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    uploaded_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    zoho_attachment_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "crm_files",
    timestamps: false,
  }
);
