import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class DialpadSmsEvents extends Model {
	public id!: string;
	public property_id!: string | null;
	public external_id!: number;
	public direction!: "inbound" | "outbound";
	public sender_id!: number | null;
	public from_number!: string | null;
	public to_numbers!: string[];
	public mms!: boolean;
	public is_internal!: boolean;
	public message_status!: string | null;
	public message_delivery_result!: string | null;
	public text!: string | null;
	public text_content!: string | null;
	public mms_url!: string | null;
	public created_date_ms!: number | null;
	public event_timestamp_ms!: number | null;
	public target!: Record<string, unknown> | null;
	public contact!: Record<string, unknown> | null;
	public raw_payload!: Record<string, unknown>;
	public created_at!: Date;
	public updated_at!: Date;
}

DialpadSmsEvents.init(
	{
		id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true,
		},
		property_id: {
			type: DataTypes.UUID,
			allowNull: true,
		},
		external_id: {
			type: DataTypes.BIGINT,
			allowNull: false,
			unique: true,
		},
		direction: {
			type: DataTypes.TEXT,
			allowNull: false,
			validate: {
				isIn: [["inbound", "outbound"]],
			},
		},
		sender_id: {
			type: DataTypes.BIGINT,
			allowNull: true,
		},
		from_number: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		to_numbers: {
			type: DataTypes.JSONB,
			allowNull: false,
			defaultValue: [],
		},
		mms: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
		is_internal: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
		message_status: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		message_delivery_result: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		text: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		text_content: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		mms_url: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		created_date_ms: {
			type: DataTypes.BIGINT,
			allowNull: true,
		},
		event_timestamp_ms: {
			type: DataTypes.BIGINT,
			allowNull: true,
		},
		target: {
			type: DataTypes.JSONB,
			allowNull: true,
		},
		contact: {
			type: DataTypes.JSONB,
			allowNull: true,
		},
		raw_payload: {
			type: DataTypes.JSONB,
			allowNull: false,
		},
		created_at: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: DataTypes.NOW,
		},
		updated_at: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: DataTypes.NOW,
		},
	},
	{
		sequelize,
		tableName: "dialpad_sms_events",
		timestamps: false,
	}
);