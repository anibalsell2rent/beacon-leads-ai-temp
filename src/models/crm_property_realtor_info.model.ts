import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmPropertyRealtorInfo extends Model {
    public id!: number;
    public property_id!: string;
    public listed_realtor!: boolean;
    public realtor_name!: string;
    public realtor_phone!: string;
    public realtor_email!: string;
    public realtor_company!: string;
    public listing_price!: number;
    public days_on_market!: number;
    public created_at!: Date;
    public updated_at!: Date;
}

CrmPropertyRealtorInfo.init(
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
        listed_realtor: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
        },
        realtor_name: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        realtor_phone: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        realtor_email: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        realtor_company: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        listing_price: {
            type: DataTypes.DECIMAL,
            allowNull: true,
        },
        days_on_market: {
            type: DataTypes.INTEGER,
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
        tableName: "crm_property_realtor_info",
        timestamps: false,
    }
);
