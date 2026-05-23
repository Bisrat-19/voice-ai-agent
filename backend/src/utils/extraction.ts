import { businessData } from "../data/business";
import { sanitizeTranscript } from "./callQuality";
import { detectEmergency } from "./emergency";
import { classifyIntent } from "./intent";
import type { StructuredCallData } from "../types";
import type { VapiCallEndedPayload } from "../types";

const PHONE_REGEX = /(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/;

const NAME_PATTERNS = [
  /(?:my name is|this is|i'm|i am|name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
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

function isValidName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) return false;
  const first = trimmed.split(/\s+/)[0].toLowerCase();
  return !NAME_BLOCKLIST.has(first);
}

export function extractCustomerName(text: string): string {
  for (const pattern of NAME_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1] && isValidName(match[1])) {
      return match[1].trim();
    }
  }
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
  const summary = payload.summary ?? "";
  const transcript = sanitizeTranscript(payload.transcript ?? "");
  const combined = `${summary}\n${transcript}`.trim();

  const isEmergency = detectEmergency(combined);
  const intent = classifyIntent(combined, isEmergency);

  return {
    callerPhone: extractPhone(combined, payload.callerPhone),
    intent,
    serviceNeeded: extractServiceNeeded(combined),
    customerName: extractCustomerName(combined),
    addressOrCity: extractServiceArea(combined),
    preferredTime: extractPreferredTime(combined),
    isEmergency,
    summary,
    transcript,
  };
}
