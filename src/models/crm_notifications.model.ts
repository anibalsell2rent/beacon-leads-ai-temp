import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmNotifications extends Model {
  public id!: string;
  public user_id!: number;
  public notification_type_id!: string;
  public message!: string;
  public is_read!: boolean;
  public created_at!: Date;
}

CrmNotifications.init(
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
    notification_type_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "crm_notifications",
    timestamps: false,
  }
);
