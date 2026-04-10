import { DialpadCallEventInsert } from "../schema/dialpadCallWebhook.schema";
import { DialpadCallEvents } from "../models";

export async function findDialpadCallEvent(
	callId: number,
	state: string,
	eventTimestamp: number | null
): Promise<DialpadCallEvents | null> {
	const existing = await DialpadCallEvents.findOne({
		where: {
			call_id: callId,
			state,
			event_timestamp: eventTimestamp,
		},
	});

	return existing;
}

export async function insertDialpadCallEvent(
	payload: DialpadCallEventInsert
): Promise<DialpadCallEvents> {
	const created = await DialpadCallEvents.create({
		...payload,
		updated_at: new Date(),
	});

	return created;
}