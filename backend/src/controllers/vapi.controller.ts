import { Request, Response } from "express";
import { validateCallEndedPayload } from "../utils/validation";
import { extractStructuredData, lookupPricing } from "../utils/extraction";
import { getMatchedEmergencyKeywords } from "../utils/emergency";
import { insertCall } from "../services/database.service";
import { AppError } from "../middleware/errorHandler";
import { logInfo } from "../utils/logger";

export async function handleCallEnded(req: Request, res: Response): Promise<void> {
  const validation = validateCallEndedPayload(req.body);

  if (validation.skipped) {
    res.status(200).json({ success: true, skipped: true });
    return;
  }

  if (!validation.valid || !validation.data) {
    throw new AppError(400, "Invalid webhook payload", validation.errors);
  }

  const payload = validation.data;
  const combined = `${payload.summary ?? ""} ${payload.transcript ?? ""}`.trim();
  const structured = extractStructuredData(payload);
  const emergencyKeywords = getMatchedEmergencyKeywords(combined);
  const pricing =
    structured.intent === "pricing_question" ? lookupPricing(combined) : null;

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
