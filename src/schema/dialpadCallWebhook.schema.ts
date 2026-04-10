export interface DialpadCallEntity {
	id?: number | string | null;
	type?: string | null;
	email?: string | null;
	phone?: string | null;
	name?: string | null;
	office_id?: number | string | null;
}

export interface DialpadRecordingDetail {
	id?: number | string | null;
	url?: string | null;
	duration?: number | null;
	start_time?: number | null;
	recording_type?: string | null;
}

export interface DialpadCallPayload {
	call_id: number | string;
	state: string;
	direction: "inbound" | "outbound" | string;

	event_timestamp?: number | null;
	date_started?: number | null;
	date_connected?: number | null;
	date_ended?: number | null;
	date_rang?: number | null;

	duration?: number | null;
	total_duration?: number | null;

	external_number?: string | null;
	internal_number?: string | null;

	was_recorded?: boolean | null;
	is_transferred?: boolean | null;

	master_call_id?: number | null;
	entry_point_call_id?: number | null;
	operator_call_id?: number | null;

	group_id?: string | null;
	custom_data?: string | null;

	transcription_text?: string | null;
	voicemail_link?: string | null;

	recap_summary?: string | null;
	recap_outcome?: string | null;
	recap_purposes?: string[] | null;
	recap_action_items?: string[] | null;

	pcsat_score?: number | null;
	csat_score?: number | null;

	target?: DialpadCallEntity | null;
	contact?: DialpadCallEntity | null;
	entry_point_target?: DialpadCallEntity | null;
	proxy_target?: DialpadCallEntity | null;

	recording_details?: DialpadRecordingDetail[] | null;
	screen_recording_urls?: string[] | null;
	csat_recording_urls?: string[] | null;
	csat_transcriptions?: string[] | null;
	call_dispositions?: unknown[] | null;
}

export interface DialpadCallEventInsert {
	property_id: string | null;

	call_id: number;
	state: string;
	direction: "inbound" | "outbound";

	event_timestamp: number | null;
	date_started: number | null;
	date_connected: number | null;
	date_ended: number | null;
	date_rang: number | null;

	duration: number | null;
	total_duration: number | null;

	external_number: string | null;
	internal_number: string | null;

	was_recorded: boolean;
	is_transferred: boolean;

	master_call_id: number | null;
	entry_point_call_id: number | null;
	operator_call_id: number | null;

	group_id: string | null;
	custom_data: string | null;

	transcription_text: string | null;
	voicemail_link: string | null;

	recap_summary: string | null;
	recap_outcome: string | null;
	recap_purposes: string[] | null;
	recap_action_items: string[] | null;

	pcsat_score: number | null;
	csat_score: number | null;

	target: Record<string, unknown> | null;
	contact: Record<string, unknown> | null;
	entry_point_target: Record<string, unknown> | null;
	proxy_target: Record<string, unknown> | null;

	recording_details: Record<string, unknown>[] | null;
	screen_recording_urls: string[] | null;
	csat_recording_urls: string[] | null;
	csat_transcriptions: string[] | null;
	call_dispositions: unknown[] | null;

	raw_payload: Record<string, unknown>;
}