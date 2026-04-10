import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmNotificationTypes extends Model {
  public id!: string;
  public name!: string;
}

CrmNotificationTypes.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "crm_notification_types",
    timestamps: false,
  }
);
