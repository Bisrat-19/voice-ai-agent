import { Request, Response } from "express";
import { shouldPersistCall } from "../utils/callQuality";
import { validateCallEndedPayload } from "../utils/validation";
import { extractStructuredData, lookupPricing } from "../utils/extraction";
import { getMatchedEmergencyKeywords } from "../utils/emergency";
import { insertCall } from "../services/database.service";
import { AppError } from "../middleware/errorHandler";
import { logInfo } from "../utils/logger";
import { getVapiWebhookEventType } from "../utils/vapiWebhook";
import { extractCallerText } from "../utils/transcriptParse";
import { sanitizeTranscript } from "../utils/callQuality";

export async function handleCallEnded(req: Request, res: Response): Promise<void> {
  const eventType = getVapiWebhookEventType(req.body);
  const validation = validateCallEndedPayload(req.body);

  if (validation.skipped) {
    logInfo("Webhook acknowledged (not stored)", {
      requestId: req.requestId,
      eventType,
    });
    res.status(200).json({ success: true, skipped: true, eventType });
    return;
  }

  if (!validation.valid || !validation.data) {
    throw new AppError(400, "Invalid webhook payload", validation.errors);
  }

  const payload = validation.data;

  if (!shouldPersistCall(payload)) {
    logInfo("Webhook ignored (no caller speech or summary)", {
      requestId: req.requestId,
      eventType,
      callId: payload.callId,
    });
    res.status(200).json({ success: true, skipped: true, reason: "no-call-content", callId: payload.callId });
    return;
  }
  const structured = extractStructuredData(payload);
  const callerText =
    extractCallerText(sanitizeTranscript(payload.transcript ?? "")) ||
    sanitizeTranscript(payload.transcript ?? "");
  const pricingSource = `${callerText} ${payload.summary ?? ""}`.trim();
  const emergencyKeywords = getMatchedEmergencyKeywords(
    `${callerText} ${payload.summary ?? ""}`.trim()
  );
  const pricing =
    structured.intent === "pricing_question" ? lookupPricing(pricingSource) : null;

  logInfo("Call stored", {
    requestId: req.requestId,
    callId: payload.callId,
    intent: structured.intent,
    serviceNeeded: structured.serviceNeeded,
    isEmergency: structured.isEmergency,
  });

  const record = await insertCall(payload.callId, structured);

  res.status(200).json({
    success: true,
    callId: payload.callId,
    data: { ...structured, id: record.id, emergencyKeywords, pricing, createdAt: record.createdAt },
  });
}
