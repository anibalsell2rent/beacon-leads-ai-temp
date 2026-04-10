import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmAcTypes extends Model {
  public id!: string;
  public name!: string;
  public description!: string;
  public is_active!: boolean;
  public created_at!: Date;
}

CrmAcTypes.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "crm_ac_types",
    timestamps: false,
  }
);
