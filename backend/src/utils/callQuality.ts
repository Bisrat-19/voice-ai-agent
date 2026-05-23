import type { VapiCallEndedPayload } from "../types";

/** Shown in stored transcripts / used for extraction — not the raw system prompt */
export function sanitizeTranscript(transcript: string): string {
  if (!transcript.trim()) return "";

  return transcript
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (/^system\s*:/i.test(trimmed)) return false;
      if (/^tool(?:-calls?)?\s*:/i.test(trimmed)) return false;
      return true;
    })
    .join("\n")
    .trim();
}

export function hasUserSpeech(text: string): boolean {
  if (!text.trim()) return false;
  return (
    /\buser\s*:/i.test(text) ||
    /\bcaller\s*:/i.test(text) ||
    /\bhuman\s*:/i.test(text)
  );
}

/** Skip rows that are only assistant/system prompt with no real caller input */
export function shouldPersistCall(payload: VapiCallEndedPayload): boolean {
  const summary = payload.summary?.trim() ?? "";
  const transcript = sanitizeTranscript(payload.transcript ?? "");

  if (summary.length > 0) return true;
  if (hasUserSpeech(transcript)) return true;

  return false;
}
