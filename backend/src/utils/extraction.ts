import { businessData } from "../data/business";
import { sanitizeTranscript } from "./callQuality";
import { detectEmergency } from "./emergency";
import { classifyIntent } from "./intent";
import { extractCallerText } from "./transcriptParse";
import type { StructuredCallData } from "../types";
import type { VapiCallEndedPayload } from "../types";

const PHONE_REGEX = /(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/;

/** Speech fillers between intro phrase and name (e.g. "my name is, uh, Michael") */
const NAME_FILLER = "(?:,\\s*(?:uh|um|er|like|you know))*";

const NAME_PATTERNS = [
  new RegExp(
    `\\bmy name(?:'s| is)${NAME_FILLER}\\s*,?\\s*([a-zA-Z][a-zA-Z'-]*(?:\\s+[a-zA-Z][a-zA-Z'-]*)?)`,
    "i"
  ),
  /\b(?:i am|i'm|call me)\b(?:,?\s*(?:uh|um|er))*,?\s+([a-zA-Z][a-zA-Z'-]*(?:\s+[a-zA-Z][a-zA-Z'-]*)?)/i,
  /\bthis is\s+([a-zA-Z][a-zA-Z'-]*(?:\s+[a-zA-Z][a-zA-Z'-]*)?)\s+(?:here|calling|speaking)\b/i,
  /(?:customer(?:'s)?|caller(?:'s)?)\s+name\s+(?:is\s+)?([a-zA-Z][a-zA-Z'-]*(?:\s+[a-zA-Z][a-zA-Z'-]*)?)/i,
  /\bnamed\s+([a-zA-Z][a-zA-Z'-]*(?:\s+[a-zA-Z][a-zA-Z'-]*)?)/i,
];

const NAME_BLOCKLIST = new Set([
  "we",
  "the",
  "a",
  "an",
  "i",
  "yes",
  "no",
  "hi",
  "hello",
  "thanks",
  "thank",
  "caller",
  "user",
  "customer",
  "marking",
  "this",
  "urgent",
  "emergency",
  "denver",
  "aurora",
  "lakewood",
  "plumbing",
  "hvac",
  "looking",
  "calling",
  "speaking",
  "here",
  "there",
  "shortly",
  "confirm",
  "appointment",
  "someone",
  "contact",
  "team",
  "provided",
  "stating",
  "tomorrow",
  "morning",
  "okay",
  "sure",
  "race",
]);

const TIME_PATTERNS = [
  /\b(tomorrow|today|tonight)\b(?:\s+(morning|afternoon|evening))?/i,
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i,
  /\b(morning|afternoon|evening|noon)\b/i,
  /\bnext week\b/i,
  /\bas soon as possible\b/i,
  /\bthis (week|weekend)\b/i,
];

/** Most specific phrases first — checked before generic keyword scoring */
const SERVICE_PHRASE_PATTERNS: { service: string; pattern: RegExp }[] = [
  {
    service: "plumbing",
    pattern: /\bplumb(?:ing)?\s+(?:diagnostic|diagnostics|repair|service|issue|problem)\b/i,
  },
  { service: "plumbing", pattern: /\b(?:plumbing|plumber|plumbers)\b/i },
  {
    service: "HVAC repair",
    pattern: /\b(?:hvac|h\.v\.a\.c)\s+(?:repair|inspection|service|issue|problem)\b/i,
  },
  {
    service: "HVAC repair",
    pattern: /\b(?:hvac|air\s+condition(?:ing|er)?|a\/c)\b/i,
  },
  {
    service: "HVAC repair",
    pattern: /\b(?:ac|a\/c)\s+(?:unit|repair|service|stopped|broken|not\s+working)\b/i,
  },
  {
    service: "HVAC repair",
    pattern: /\b(?:furnace|heating|cooling|heat\s+pump)\b(?:\s+(?:repair|service|issue|problem))?\b/i,
  },
  {
    service: "water heater repair",
    pattern: /\b(?:water\s+heater|hot\s+water\s+heater|tankless)\b/i,
  },
  {
    service: "electrical inspection",
    pattern: /\belectrical\s+(?:inspection|issue|problem|repair|service)\b/i,
  },
  { service: "electrical inspection", pattern: /\b(?:wiring|breaker|panel)\s+(?:issue|problem|repair)\b/i },
];

/** Word-boundary keyword scoring — avoids false matches like "ac" in "acknowledged" */
const SERVICE_KEYWORD_SCORES: { service: string; keywords: string[] }[] = [
  {
    service: "plumbing",
    keywords: ["plumbing", "plumber", "plumb", "pipe", "drain", "faucet", "toilet", "sewer"],
  },
  {
    service: "HVAC repair",
    keywords: ["hvac", "furnace", "heating", "cooling", "heat pump"],
  },
  {
    service: "HVAC repair",
    keywords: ["air conditioning", "air conditioner"],
  },
  { service: "water heater repair", keywords: ["water heater", "hot water", "tankless"] },
  {
    service: "electrical inspection",
    keywords: ["electrical", "electric", "wiring", "outlet", "breaker", "panel"],
  },
];

const SHORT_BOUNDARY_KEYWORDS: Record<string, string[]> = {
  "HVAC repair": ["ac", "a/c"],
  plumbing: ["leak"],
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordMatches(text: string, keyword: string): boolean {
  const normalized = text.toLowerCase();
  if (keyword.length <= 4) {
    return new RegExp(`\\b${escapeRegex(keyword)}\\b`, "i").test(normalized);
  }
  return normalized.includes(keyword);
}

export function extractPhone(text: string, fallback?: string): string {
  const match = text.match(PHONE_REGEX);
  return match?.[1]?.trim() ?? fallback ?? "";
}

function titleCaseName(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function isValidName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) return false;
  const words = trimmed.toLowerCase().split(/\s+/);
  if (words.every((w) => NAME_BLOCKLIST.has(w))) return false;
  const first = words[0];
  return !NAME_BLOCKLIST.has(first);
}

/** Caller answered a name question with a short reply (e.g. assistant: "Your name?" → user: "Bisrat") */
function extractNameFromDirectAnswer(transcript: string): string {
  const lines = transcript.split("\n");
  let pendingNameQuestion = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^(assistant|bot|ai)\s*:/i.test(trimmed) || /^AI\s*:/i.test(trimmed)) {
      pendingNameQuestion = /\b(?:your\s+name|name please|who am i speaking|may i (?:have|get) your name|what(?:'s| is) your name)\b/i.test(
        trimmed
      );
      continue;
    }

    const userMatch = trimmed.match(/^(?:user|caller|human)\s*:\s*(.+)$/i);
    if (!userMatch) continue;

    const answer = userMatch[1].trim();

    const introName = answer.match(
      new RegExp(`\\bmy name(?:'s| is)${NAME_FILLER}\\s*,?\\s*([a-zA-Z][a-zA-Z'-]+)`, "i")
    );
    if (introName?.[1] && isValidName(introName[1])) {
      return titleCaseName(introName[1]);
    }

    if (pendingNameQuestion && /^[a-zA-Z][a-zA-Z'-]*(?:\s+[a-zA-Z][a-zA-Z'-]*)?$/.test(answer)) {
      if (isValidName(answer)) return titleCaseName(answer);
    }
    pendingNameQuestion = false;
  }

  return "";
}

/** Assistant often repeats the caller's name: "Thank you, Michael." */
function extractNameFromAssistantConfirmation(transcript: string): string {
  for (const line of transcript.split("\n")) {
    const trimmed = line.trim();
    if (!/^(assistant|bot|ai)\s*:/i.test(trimmed) && !/^AI\s*:/i.test(trimmed)) continue;
    const match = trimmed.match(/\b(?:thank you|thanks),?\s+([a-zA-Z][a-zA-Z'-]+)\b/i);
    if (match?.[1] && isValidName(match[1])) {
      return titleCaseName(match[1]);
    }
  }
  return "";
}

const SUMMARY_NAME_LEAD =
  /^([a-zA-Z][a-zA-Z'-]*(?:\s+[a-zA-Z][a-zA-Z'-]*)?)\s+(?:called|requested|asked|needs|wanted|inquired)/i;

function tryNamePatterns(text: string): string {
  for (const pattern of NAME_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1] && isValidName(match[1])) {
      return titleCaseName(match[1].trim());
    }
  }
  return "";
}

export function extractCustomerName(
  callerText: string,
  summary = "",
  fullTranscript = ""
): string {
  const summaryLead = summary.match(SUMMARY_NAME_LEAD);
  if (summaryLead?.[1] && isValidName(summaryLead[1])) {
    return titleCaseName(summaryLead[1].trim());
  }

  const fromCaller = tryNamePatterns(callerText);
  if (fromCaller) return fromCaller;

  if (fullTranscript) {
    const fromDirect = extractNameFromDirectAnswer(fullTranscript);
    if (fromDirect) return fromDirect;

    const fromAssistant = extractNameFromAssistantConfirmation(fullTranscript);
    if (fromAssistant) return fromAssistant;
  }

  const fromSummaryPatterns = tryNamePatterns(summary);
  if (fromSummaryPatterns) return fromSummaryPatterns;

  return "";
}

export function extractPreferredTime(text: string): string {
  for (const pattern of TIME_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  return "";
}

export function extractServiceArea(text: string): string {
  const normalized = text.toLowerCase();
  for (const area of businessData.serviceAreas) {
    if (normalized.includes(area.toLowerCase())) {
      return area;
    }
  }

  const cityMatch = text.match(
    /\b(?:in|at|near|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/
  );
  return cityMatch?.[1]?.trim() ?? "";
}

export function scoreServiceKeywords(text: string): Map<string, number> {
  const scores = new Map<string, number>();

  for (const { service, keywords } of SERVICE_KEYWORD_SCORES) {
    let score = scores.get(service) ?? 0;
    for (const keyword of keywords) {
      if (keywordMatches(text, keyword)) {
        score += keyword.length >= 6 ? 2 : 1;
      }
    }
    const shortKeywords = SHORT_BOUNDARY_KEYWORDS[service];
    if (shortKeywords) {
      for (const keyword of shortKeywords) {
        if (keywordMatches(text, keyword)) {
          score += 1;
        }
      }
    }
    if (score > 0) {
      scores.set(service, score);
    }
  }

  return scores;
}

export function extractServiceNeeded(text: string): string {
  for (const { service, pattern } of SERVICE_PHRASE_PATTERNS) {
    if (pattern.test(text)) {
      return service;
    }
  }

  const scores = scoreServiceKeywords(text);
  let bestService = "";
  let bestScore = 0;

  for (const [service, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      bestService = service;
    }
  }

  return bestService;
}

export function lookupPricing(serviceText: string): string | null {
  const normalized = serviceText.toLowerCase();

  if (
    normalized.includes("plumb") &&
    (normalized.includes("diagnostic") || normalized.includes("inspect"))
  ) {
    return businessData.pricing["plumbing diagnostic"];
  }

  if (
    (normalized.includes("hvac") || /\b(ac|a\/c|air\s+condition)\b/i.test(normalized)) &&
    (normalized.includes("inspect") || normalized.includes("inspection"))
  ) {
    return businessData.pricing["HVAC inspection"];
  }

  for (const [service, price] of Object.entries(businessData.pricing)) {
    if (normalized.includes(service.toLowerCase())) {
      return price;
    }
  }

  return null;
}

export function extractStructuredData(
  payload: VapiCallEndedPayload
): StructuredCallData {
  const summary = payload.summary?.trim() ?? "";
  const transcript = sanitizeTranscript(payload.transcript ?? "");
  const callerFromTranscript = extractCallerText(transcript);
  /** Caller speech only — avoids matching services/cities from assistant script */
  const callerText = callerFromTranscript || transcript;
  const phoneSource = `${callerText} ${summary}`.trim();

  const isEmergency =
    detectEmergency(callerText) || (summary.length > 0 && detectEmergency(summary));
  const intent = classifyIntent(callerText, isEmergency);
  const serviceFromCaller = extractServiceNeeded(callerText);
  const serviceNeeded =
    serviceFromCaller ||
    (callerFromTranscript ? "" : extractServiceNeeded(summary));

  return {
    callerPhone: extractPhone(phoneSource, payload.callerPhone),
    intent,
    serviceNeeded,
    customerName: extractCustomerName(callerText, summary, transcript),
    addressOrCity:
      extractServiceArea(callerText) || extractServiceArea(summary),
    preferredTime:
      extractPreferredTime(callerText) || extractPreferredTime(summary),
    isEmergency,
    summary,
    transcript,
  };
}
