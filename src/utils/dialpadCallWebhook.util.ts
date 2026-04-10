import {
	DialpadCallEventInsert,
	DialpadCallPayload,
} from "../schema/dialpadCallWebhook.schema";

export function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseDialpadCallPayload(input: unknown): DialpadCallPayload {
	if (!isObject(input)) {
		throw new Error("Invalid request body");
	}

	if ("call_id" in input) {
		return input as unknown as DialpadCallPayload;
	}

	const nestedBody = input.body;

	if (typeof nestedBody === "string" && nestedBody.trim() !== "") {
		try {
			return JSON.parse(nestedBody) as DialpadCallPayload;
		} catch (error) {
			throw new Error("Invalid JSON inside body field");
		}
	}

	throw new Error("Dialpad call payload not found");
}

export function toNullableString(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}

	const trimmed = value.trim();

	if (trimmed === "") {
		return null;
	}

	return trimmed;
}

export function toNullableNumber(value: unknown): number | null {
	if (value === null || value === undefined || value === "") {
		return null;
	}

	const parsed = Number(value);

	if (Number.isNaN(parsed)) {
		return null;
	}

	return parsed;
}

export function toBoolean(value: unknown, fallback = false): boolean {
	if (typeof value === "boolean") {
		return value;
	}

	return fallback;
}

export function toStringArray(value: unknown): string[] | null {
	if (value === null || value === undefined) {
		return null;
	}

	if (!Array.isArray(value)) {
		return null;
	}

	return value
		.filter((item) => typeof item === "string")
		.map((item) => item.trim())
		.filter((item) => item !== "");
}

export function toUnknownArray(value: unknown): unknown[] | null {
	if (value === null || value === undefined) {
		return null;
	}

	if (!Array.isArray(value)) {
		return null;
	}

	return value;
}

export function toObjectOrNull(value: unknown): Record<string, unknown> | null {
	if (!isObject(value)) {
		return null;
	}

	return value;
}

export function toObjectArrayOrNull(value: unknown): Record<string, unknown>[] | null {
	if (value === null || value === undefined) {
		return null;
	}

	if (!Array.isArray(value)) {
		return null;
	}

	const filtered = value.filter((item) => isObject(item)) as Record<string, unknown>[];

	return filtered.length > 0 ? filtered : [];
}

export function validateDialpadCallPayload(payload: DialpadCallPayload): void {
	const callId = toNullableNumber(payload.call_id);
	const state = toNullableString(payload.state);
	const direction = toNullableString(payload.direction)?.toLowerCase();

	if (callId === null) {
		throw new Error("Field call_id is required");
	}

	if (state === null) {
		throw new Error("Field state is required");
	}

	if (direction !== "inbound" && direction !== "outbound") {
		throw new Error("Field direction must be inbound or outbound");
	}
}

export function buildDialpadCallInsertObject(
	payload: DialpadCallPayload
): DialpadCallEventInsert {
	const callId = toNullableNumber(payload.call_id);
	const state = toNullableString(payload.state);
	const direction = toNullableString(payload.direction)?.toLowerCase();

	if (callId === null) {
		throw new Error("Invalid call_id");
	}

	if (state === null) {
		throw new Error("Invalid state");
	}

	if (direction !== "inbound" && direction !== "outbound") {
		throw new Error("Invalid direction");
	}

	const eventTimestamp =
		toNullableNumber(payload.event_timestamp) ?? Date.now();

	return {
		property_id: null,

		call_id: callId,
		state,
		direction,

		event_timestamp: eventTimestamp,
		date_started: toNullableNumber(payload.date_started),
		date_connected: toNullableNumber(payload.date_connected),
		date_ended: toNullableNumber(payload.date_ended),
		date_rang: toNullableNumber(payload.date_rang),

		duration: toNullableNumber(payload.duration),
		total_duration: toNullableNumber(payload.total_duration),

		external_number: toNullableString(payload.external_number),
		internal_number: toNullableString(payload.internal_number),

		was_recorded: toBoolean(payload.was_recorded, false),
		is_transferred: toBoolean(payload.is_transferred, false),

		master_call_id: toNullableNumber(payload.master_call_id),
		entry_point_call_id: toNullableNumber(payload.entry_point_call_id),
		operator_call_id: toNullableNumber(payload.operator_call_id),

		group_id: toNullableString(payload.group_id),
		custom_data: toNullableString(payload.custom_data),

		transcription_text: toNullableString(payload.transcription_text),
		voicemail_link: toNullableString(payload.voicemail_link),

		recap_summary: toNullableString(payload.recap_summary),
		recap_outcome: toNullableString(payload.recap_outcome),
		recap_purposes: toStringArray(payload.recap_purposes),
		recap_action_items: toStringArray(payload.recap_action_items),

		pcsat_score: toNullableNumber(payload.pcsat_score),
		csat_score: toNullableNumber(payload.csat_score),

		target: toObjectOrNull(payload.target),
		contact: toObjectOrNull(payload.contact),
		entry_point_target: toObjectOrNull(payload.entry_point_target),
		proxy_target: toObjectOrNull(payload.proxy_target),

		recording_details: toObjectArrayOrNull(payload.recording_details),
		screen_recording_urls: toStringArray(payload.screen_recording_urls),
		csat_recording_urls: toStringArray(payload.csat_recording_urls),
		csat_transcriptions: toStringArray(payload.csat_transcriptions),
		call_dispositions: toUnknownArray(payload.call_dispositions),

		raw_payload: payload as unknown as Record<string, unknown>,
	};
}