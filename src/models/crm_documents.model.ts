import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmDocuments extends Model {
  public id!: string;
  public entity_type!: string;
  public entity_id!: string;
  public file_name!: string;
  public file_url!: string;
  public uploaded_by!: number;
  public created_at!: Date;
  public zoho_attachment_id!: string;
}

CrmDocuments.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    entity_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    entity_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    file_name: {
      type: DataTypes.STRING,
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
    tableName: "crm_documents",
    timestamps: false,
  }
);
