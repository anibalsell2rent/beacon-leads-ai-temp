import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmCalendarEvents extends Model {
  public id!: string;
  public user_id!: number;
  public title!: string;
  public description!: string;
  public start_time!: Date;
  public end_time!: Date;
  public google_event_id!: string;
  public created_at!: Date;
}

CrmCalendarEvents.init(
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
    title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    google_event_id: {
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
    tableName: "crm_calendar_events",
    timestamps: false,
  }
);
