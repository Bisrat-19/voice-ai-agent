import type { VapiCallEndedPayload } from "../types";
import { normalizeVapiWebhook } from "./vapiWebhook";

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors: string[];
  skipped?: boolean;
}

export function validateCallEndedPayload(
  body: unknown
): ValidationResult<VapiCallEndedPayload> {
  if (!body || typeof body !== "object") {
    return { valid: false, errors: ["Request body must be a JSON object"] };
  }

  const normalized = normalizeVapiWebhook(body);

  if (!normalized) {
    const message = (body as Record<string, unknown>).message;
    const type =
      message &&
      typeof message === "object" &&
      typeof (message as Record<string, unknown>).type === "string"
        ? (message as Record<string, unknown>).type
        : null;

    if (type && type !== "end-of-call-report") {
      return { valid: true, skipped: true, errors: [] };
    }

    return {
      valid: false,
      errors: ["Missing callId — expected end-of-call-report or flat webhook body"],
    };
  }

  return { valid: true, data: normalized, errors: [] };
}

export function parsePagination(query: {
  page?: string;
  limit?: string;
}): { page: number; limit: number } {
  const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? "20", 10) || 20));
  return { page, limit };
}
