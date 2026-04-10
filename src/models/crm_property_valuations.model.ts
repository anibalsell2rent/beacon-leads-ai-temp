import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmPropertyValuations extends Model {
    public id!: number;
    public property_id!: string;
    public house_canary!: number;
    public batch_data_arv!: number;
    public arv_after_repair!: number;
    public zillow_estimate!: number;
    public redfin_estimate!: number;
    public appraisal_value!: number;
    public appraisal_date!: Date;
    public price_per_sqft!: number;
    public created_at!: Date;
    public updated_at!: Date;
}

CrmPropertyValuations.init(
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
        house_canary: {
            type: DataTypes.DECIMAL,
            allowNull: true,
        },
        batch_data_arv: {
            type: DataTypes.DECIMAL,
            allowNull: true,
        },
        arv_after_repair: {
            type: DataTypes.DECIMAL,
            allowNull: true,
        },
        zillow_estimate: {
            type: DataTypes.DECIMAL,
            allowNull: true,
        },
        redfin_estimate: {
            type: DataTypes.DECIMAL,
            allowNull: true,
        },
        appraisal_value: {
            type: DataTypes.DECIMAL,
            allowNull: true,
        },
        appraisal_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        price_per_sqft: {
            type: DataTypes.DECIMAL,
            allowNull: true,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: "crm_property_valuations",
        timestamps: false,
    }
);
