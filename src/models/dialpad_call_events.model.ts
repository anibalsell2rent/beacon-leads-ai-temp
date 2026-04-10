import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class DialpadCallEvents extends Model {}

DialpadCallEvents.init(
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
		call_id: {
			type: DataTypes.BIGINT,
			allowNull: false,
		},
		state: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		direction: {
			type: DataTypes.TEXT,
			allowNull: false,
			validate: {
				isIn: [["inbound", "outbound"]],
			},
		},
		event_timestamp: {
			type: DataTypes.BIGINT,
			allowNull: true,
		},
		date_started: {
			type: DataTypes.BIGINT,
			allowNull: true,
		},
		date_connected: {
			type: DataTypes.BIGINT,
			allowNull: true,
		},
		date_ended: {
			type: DataTypes.BIGINT,
			allowNull: true,
		},
		date_rang: {
			type: DataTypes.BIGINT,
			allowNull: true,
		},
		duration: {
			type: DataTypes.BIGINT,
			allowNull: true,
		},
		total_duration: {
			type: DataTypes.BIGINT,
			allowNull: true,
		},
		external_number: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		internal_number: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		was_recorded: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
		is_transferred: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
		master_call_id: {
			type: DataTypes.BIGINT,
			allowNull: true,
		},
		entry_point_call_id: {
			type: DataTypes.BIGINT,
			allowNull: true,
		},
		operator_call_id: {
			type: DataTypes.BIGINT,
			allowNull: true,
		},
		group_id: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		custom_data: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		transcription_text: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		voicemail_link: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		recap_summary: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		recap_outcome: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		recap_purposes: {
			type: DataTypes.JSONB,
			allowNull: true,
		},
		recap_action_items: {
			type: DataTypes.JSONB,
			allowNull: true,
		},
		pcsat_score: {
			type: DataTypes.INTEGER,
			allowNull: true,
		},
		csat_score: {
			type: DataTypes.INTEGER,
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
		entry_point_target: {
			type: DataTypes.JSONB,
			allowNull: true,
		},
		proxy_target: {
			type: DataTypes.JSONB,
			allowNull: true,
		},
		recording_details: {
			type: DataTypes.JSONB,
			allowNull: true,
		},
		screen_recording_urls: {
			type: DataTypes.JSONB,
			allowNull: true,
		},
		csat_recording_urls: {
			type: DataTypes.JSONB,
			allowNull: true,
		},
		csat_transcriptions: {
			type: DataTypes.JSONB,
			allowNull: true,
		},
		call_dispositions: {
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
		tableName: "dialpad_call_events",
		timestamps: false,
		indexes: [
			{
				unique: true,
				fields: ["call_id", "state", "event_timestamp"],
				name: "uq_dialpad_call_events_unique_event",
			},
		],
	}
);