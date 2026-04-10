import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmUsersRoles extends Model {
  public id!: string;
  public user_id!: number;
  public role_id!: string;
}

CrmUsersRoles.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    role_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "crm_users_roles",
    timestamps: false,
  }
);
