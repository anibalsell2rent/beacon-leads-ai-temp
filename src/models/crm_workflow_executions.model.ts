import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmWorkflowExecutions extends Model {
  public id!: string;
  public workflow_id!: string;
  public entity_id!: string;
  public executed_at!: Date;
  public status!: string;
}

CrmWorkflowExecutions.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    workflow_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    entity_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    executed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "crm_workflow_executions",
    timestamps: false,
  }
);
