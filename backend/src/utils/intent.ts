import type { SupportedIntent } from "../data/business";

const INTENT_PATTERNS: { intent: SupportedIntent; patterns: RegExp[] }[] = [
  {
    intent: "emergency",
    patterns: [
      /\bemergency\b/i,
      /\burgent\b/i,
      /\bimmediately\b/i,
      /\basap\b/i,
      /\bright away\b/i,
      /\bgas leak\b/i,
      /\bburst pipe\b/i,
      /\bflood(ing|ed)?\b/i,
      /\bno heat\b/i,
    ],
  },
  {
    intent: "booking_request",
    patterns: [
      /\bbook(ing)?\b/i,
      /\bschedule\b/i,
      /\bappointment\b/i,
      /\bcome out\b/i,
      /\bsend someone\b/i,
      /\bvisit\b/i,
      /\brepair\b/i,
      /\bfixed\b/i,
      /\binstall\b/i,
    ],
  },
  {
    intent: "pricing_question",
    patterns: [
      /\bhow much\b/i,
      /\bprice\b/i,
      /\bcost\b/i,
      /\brate\b/i,
      /\bquote\b/i,
      /\bcharge\b/i,
      /\b\$[\d]+/i,
      /\bdiagnostic fee\b/i,
      /\binspection fee\b/i,
    ],
  },
  {
    intent: "service_area_question",
    patterns: [
      /\bservice area\b/i,
      /\bdo you (serve|cover)\b/i,
      /\bavailable in\b/i,
      /\bin my (area|city|neighborhood)\b/i,
      /\bcome to\b/i,
      /\bcoverage\b/i,
    ],
  },
];

export function classifyIntent(text: string, isEmergency: boolean): SupportedIntent {
  if (isEmergency) {
    return "emergency";
  }

  const normalized = text.toLowerCase();
  let bestIntent: SupportedIntent = "unknown_request";
  let bestScore = 0;

  for (const { intent, patterns } of INTENT_PATTERNS) {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  return bestIntent;
}
