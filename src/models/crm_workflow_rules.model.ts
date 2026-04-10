import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmWorkflowRules extends Model {
  public id!: string;
  public name!: string;
  public entity_type!: string;
  public trigger_event!: string;
  public conditions!: any;
  public actions!: any;
  public is_active!: boolean;
  public created_at!: Date;
}

CrmWorkflowRules.init(
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
    entity_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    trigger_event: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    conditions: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    actions: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    is_active: {
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
    tableName: "crm_workflow_rules",
    timestamps: false,
  }
);
