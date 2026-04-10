import {
	DialpadSmsEventInsert,
	DialpadSmsPayload,
} from "../schema/dialpadSmsWebhook.schema";

export function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseDialpadPayload(input: unknown): DialpadSmsPayload {
	if (!isObject(input)) {
		throw new Error("Invalid request body");
	}

	if ("id" in input) {
		return input as unknown as DialpadSmsPayload;
	}

	const nestedBody = input.body;

	if (typeof nestedBody === "string" && nestedBody.trim() !== "") {
		try {
			const parsed = JSON.parse(nestedBody) as DialpadSmsPayload;
			return parsed;
		} catch (error) {
			throw new Error("Invalid JSON inside body field");
		}
	}

	throw new Error("Dialpad payload not found");
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

export function toStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.filter((item) => typeof item === "string")
		.map((item) => item.trim())
		.filter((item) => item !== "");
}

export function validateDialpadPayload(payload: DialpadSmsPayload): void {
	const externalId = toNullableNumber(payload.id);
	const direction = toNullableString(payload.direction)?.toLowerCase();

	if (externalId === null) {
		throw new Error("Field id is required");
	}

	if (direction !== "inbound" && direction !== "outbound") {
		throw new Error("Field direction must be inbound or outbound");
	}
}

export function buildDialpadInsertObject(
	payload: DialpadSmsPayload
): DialpadSmsEventInsert {
	const externalId = toNullableNumber(payload.id);
	const direction = toNullableString(payload.direction)?.toLowerCase();

	if (externalId === null) {
		throw new Error("Invalid id");
	}

	if (direction !== "inbound" && direction !== "outbound") {
		throw new Error("Invalid direction");
	}

	return {
		property_id: null,
		external_id: externalId,
		direction,
		sender_id: toNullableNumber(payload.sender_id),
		from_number: toNullableString(payload.from_number),
		to_numbers: toStringArray(payload.to_number),
		mms: toBoolean(payload.mms, false),
		is_internal: toBoolean(payload.is_internal, false),
		message_status: toNullableString(payload.message_status),
		message_delivery_result: toNullableString(payload.message_delivery_result),
		text: toNullableString(payload.text),
		text_content: toNullableString(payload.text_content),
		mms_url: toNullableString(payload.mms_url),
		created_date_ms: toNullableNumber(payload.created_date),
		event_timestamp_ms: toNullableNumber(payload.event_timestamp),
		target: isObject(payload.target) ? payload.target : null,
		contact: isObject(payload.contact) ? payload.contact : null,
		raw_payload: payload as unknown as Record<string, unknown>,
	};
}