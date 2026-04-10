import { DialpadSmsEventInsert } from "../schema/dialpadSmsWebhook.schema";
import { DialpadSmsEvents } from "../models";

export async function findDialpadSmsEventByExternalId(
	externalId: number
): Promise<DialpadSmsEvents | null> {
	const existing = await DialpadSmsEvents.findOne({
		where: {
			external_id: externalId,
		},
	});

	return existing;
}

export async function insertDialpadSmsEvent(
	payload: DialpadSmsEventInsert
): Promise<DialpadSmsEvents> {
	const created = await DialpadSmsEvents.create({
		...payload,
		updated_at: new Date(),
	});

	return created;
}