import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmUserRoles extends Model {
  public id!: number;
  public user_id!: number;
  public role_id!: number;
  public assigned_at!: Date;
  public assigned_by!: number;
}

CrmUserRoles.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      unique: true,
      allowNull: true,
    },
    role_id: {
      type: DataTypes.INTEGER,
      unique: true,
      allowNull: true,
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    assigned_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "crm_user_roles",
    timestamps: false,
  }
);
