import { Router } from "express";
import { webhookSms } from "../controllers/dialpadSmsWebhook.controller";

const router = Router();

router.post("/dialpad/sms", webhookSms);

export default router;