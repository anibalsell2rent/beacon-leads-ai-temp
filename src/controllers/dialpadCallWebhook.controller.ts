import { Request, Response } from "express";

import {
  buildDialpadCallInsertObject,
  parseDialpadCallPayload,
  validateDialpadCallPayload,
} from "../utils/dialpadCallWebhook.util";
import {
  findDialpadCallEvent,
  insertDialpadCallEvent,
} from "../services/dialpadCallWebhook.service";

export const webhookCall = async (req: Request, res: Response) => {
  try {
    console.log("Dialpad call webhook headers:", req.headers);
    console.log("Dialpad call webhook body:", JSON.stringify(req.body, null, 2));

    const payload = parseDialpadCallPayload(req.body);

    validateDialpadCallPayload(payload);

    const processedPayload = buildDialpadCallInsertObject(payload);

    const existing = await findDialpadCallEvent(
      processedPayload.call_id,
      processedPayload.state,
      processedPayload.event_timestamp
    );

    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Duplicate call event ignored",
        data: {
          payload: processedPayload,
          record: existing.toJSON(),
        },
      });
    }

    const createdRecord = await insertDialpadCallEvent(processedPayload);

    return res.status(201).json({
      success: true,
      message: "Dialpad call event processed and stored successfully",
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
      message.includes("Dialpad call payload not found") ||
      message.includes("Field call_id is required") ||
      message.includes("Field state is required") ||
      message.includes("Field direction must be inbound or outbound") ||
      message.includes("Invalid call_id") ||
      message.includes("Invalid state") ||
      message.includes("Invalid direction");

    return res.status(isValidationError ? 400 : 500).json({
      success: false,
      message,
    });
  }
}