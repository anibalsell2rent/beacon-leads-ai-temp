import { Router } from "express";
import { webhookCall } from "../controllers/dialpadCallWebhook.controller";

const router = Router();

router.post("/dialpad/calls", webhookCall);

export default router;