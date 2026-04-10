import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmPropertyLiens extends Model {
  public id!: string;
  public property_id!: string;
  public lien_type!: string;
  public lien_holder!: string;
  public lien_amount!: number;
  public lien_recorded_date!: Date;
  public lien_status!: string;
  public notes!: string;
  public created_at!: Date;
}

CrmPropertyLiens.init(
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
    lien_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lien_holder: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lien_amount: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    lien_recorded_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    lien_status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "crm_property_liens",
    timestamps: false,
  }
);
