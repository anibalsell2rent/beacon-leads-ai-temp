import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class PropertiesLeadScoring extends Model {
    public id!: number;
    public property_id!: string;
    public section!: string; // 'initial' | 'final'
    public seller_score!: number;
    public property_score!: number;
    public transaction_score!: number;
    public investor_score!: number;
    public s2r_fee!: number;
}

PropertiesLeadScoring.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        property_id: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        section: {
            type: DataTypes.TEXT, // 'initial' or 'final'
            allowNull: true,
        },
        seller_score: {
            type: DataTypes.DECIMAL,
            allowNull: true,
        },
        property_score: {
            type: DataTypes.DECIMAL,
            allowNull: true,
        },
        transaction_score: {
            type: DataTypes.DECIMAL,
            allowNull: true,
        },
        investor_score: {
            type: DataTypes.DECIMAL,
            allowNull: true,
        },
        s2r_fee: {
            type: DataTypes.DECIMAL,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: "properties_lead_scoring",
        timestamps: false,
    }
);
