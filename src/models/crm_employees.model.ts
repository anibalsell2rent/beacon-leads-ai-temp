import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmEmployees extends Model {
  public id!: string;
  public user_id!: number;
  public role_id!: string;
  public created_at!: Date;
  public employee_code!: string;
  public initials!: string;
  public department!: string;
  public manager_id!: string;
  public monthly_goal!: number;
  public quarterly_goal!: number;
  public yearly_goal!: number;
  public hire_date!: Date;
  public is_active!: boolean;
  public google_calendar_id!: string;
  public google_refresh_token!: string;
  public updated_at!: Date;
}

CrmEmployees.init(
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
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    employee_code: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },
    initials: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    manager_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    monthly_goal: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    quarterly_goal: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    yearly_goal: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    hire_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    google_calendar_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    google_refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "crm_employees",
    timestamps: false,
  }
);
