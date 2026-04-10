import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmStages extends Model {
  public id!: string;
  public name!: string;
  public stage_type!: string;
  public position!: number;
  public is_terminal!: boolean;
}

CrmStages.init(
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
    stage_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    is_terminal: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "crm_stages",
    timestamps: false,
  }
);
