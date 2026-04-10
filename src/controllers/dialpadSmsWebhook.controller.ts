import { Request, Response } from "express";

import {
  buildDialpadInsertObject,
  parseDialpadPayload,
  validateDialpadPayload,
} from "../utils/dialpadSmsWebhook.util";
import {
  findDialpadSmsEventByExternalId,
  insertDialpadSmsEvent,
} from "../services/dialpadSmsWebhook.service";

export const webhookSms = async (req: Request, res: Response) => {
  try {
    console.log("Dialpad webhook headers:", req.headers);
    console.log("Dialpad webhook body:", JSON.stringify(req.body, null, 2));

    const payload = parseDialpadPayload(req.body);

    validateDialpadPayload(payload);

    const processedPayload = buildDialpadInsertObject(payload);

    const existing = await findDialpadSmsEventByExternalId(
      processedPayload.external_id
    );

    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Duplicate event ignored",
        data: {
          payload: processedPayload,
          record: existing.toJSON(),
        },
      });
    }

    const createdRecord = await insertDialpadSmsEvent(processedPayload);

    return res.status(201).json({
      success: true,
      message: "Dialpad payload processed and stored successfully",
      data: {
        payload: processedPayload,
        record: createdRecord.toJSON(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";

    const isValidationError =
      message.includes("Invalid request body") ||
      message.includes("Invalid JSON inside body field") ||
      message.includes("Dialpad payload not found") ||
      message.includes("Field id is required") ||
      message.includes("Field direction must be inbound or outbound") ||
      message.includes("Invalid id") ||
      message.includes("Invalid direction");

    return res.status(isValidationError ? 400 : 500).json({
      success: false,
      message,
    });
  }
}