import type { VapiCallEndedPayload } from "../types";
import { sanitizeTranscript } from "./callQuality";

const END_OF_CALL_REPORT = "end-of-call-report";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function extractCallerPhone(call: Record<string, unknown> | null): string | undefined {
  if (!call) return undefined;

  const customer = asRecord(call.customer);
  const phoneNumber = asRecord(call.phoneNumber);

  return pickString(
    customer?.number,
    call.phoneNumber,
    phoneNumber?.number,
    call.callerPhone,
    call.from
  );
}

const STORABLE_MESSAGE_ROLES = new Set(["user", "assistant", "bot"]);

function buildTranscriptFromMessages(messages: unknown): string | undefined {
  if (!Array.isArray(messages) || messages.length === 0) return undefined;

  const lines = messages
    .map((entry) => {
      const row = asRecord(entry);
      if (!row) return "";
      const role = (pickString(row.role) ?? "unknown").toLowerCase();
      if (!STORABLE_MESSAGE_ROLES.has(role)) return "";
      const text = pickString(row.message, row.content, row.transcript) ?? "";
      return text ? `${role}: ${text}` : "";
    })
    .filter(Boolean);

  return lines.length > 0 ? lines.join("\n") : undefined;
}

export function getVapiWebhookEventType(body: unknown): string | null {
  const root = asRecord(body);
  if (!root) return null;

  const message = asRecord(root.message);
  if (message) return pickString(message.type) ?? null;

  if (pickString(root.callId, root.call_id)) return "flat-test";
  return null;
}

/**
 * Normalizes Vapi server URL payloads and flat test webhooks into one shape.
 * Returns null when the event should be acknowledged but not stored.
 */
export function normalizeVapiWebhook(body: unknown): VapiCallEndedPayload | null {
  const root = asRecord(body);
  if (!root) return null;

  const message = asRecord(root.message);

  if (message) {
    const type = pickString(message.type);
    if (type !== END_OF_CALL_REPORT) {
      return null;
    }

    const call = asRecord(message.call);
    const artifact = asRecord(message.artifact);

    const callId = pickString(call?.id, call?.callId);
    if (!callId) return null;

    const summary = pickString(message.summary, message.analysis);
    const rawTranscript = pickString(
      message.transcript,
      artifact?.transcript,
      buildTranscriptFromMessages(message.messages),
      buildTranscriptFromMessages(artifact?.messages)
    );
    const transcript = rawTranscript ? sanitizeTranscript(rawTranscript) : undefined;

    return {
      callId,
      callerPhone: extractCallerPhone(call),
      summary,
      transcript,
    };
  }

  // Flat format (curl tests / custom integrations)
  const callId = pickString(root.callId, root.call_id);
  if (!callId) return null;

  const rawTranscript = pickString(root.transcript);
  return {
    callId,
    callerPhone: pickString(root.callerPhone, root.caller_phone),
    summary: pickString(root.summary),
    transcript: rawTranscript ? sanitizeTranscript(rawTranscript) : undefined,
  };
}
