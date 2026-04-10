export interface DialpadEntity {
	id?: number | string | null;
	type?: string | null;
	email?: string | null;
	phone?: string | null;
	phone_number?: string | null;
	name?: string | null;
	office_id?: number | string | null;
	members?: unknown[] | null;
}

export interface DialpadSmsPayload {
	id: number | string;
	created_date?: number | null;
	direction: "inbound" | "outbound" | string;
	event_timestamp?: number | null;
	target?: DialpadEntity | null;
	contact?: DialpadEntity | null;
	sender_id?: number | string | null;
	from_number?: string | null;
	to_number?: string[] | null;
	mms?: boolean | null;
	is_internal?: boolean | null;
	message_status?: string | null;
	message_delivery_result?: string | null;
	text?: string | null;
	text_content?: string | null;
	mms_url?: string | null;
}

export interface DialpadSmsEventInsert {
	property_id: string | null;
	external_id: number;
	direction: "inbound" | "outbound";
	sender_id: number | null;
	from_number: string | null;
	to_numbers: string[];
	mms: boolean;
	is_internal: boolean;
	message_status: string | null;
	message_delivery_result: string | null;
	text: string | null;
	text_content: string | null;
	mms_url: string | null;
	created_date_ms: number | null;
	event_timestamp_ms: number | null;
	target: Record<string, unknown> | null;
	contact: Record<string, unknown> | null;
	raw_payload: Record<string, unknown>;
}