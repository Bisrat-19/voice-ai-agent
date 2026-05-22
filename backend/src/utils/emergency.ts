import { businessData } from "../data/business";

export function detectEmergency(text: string): boolean {
  const normalized = text.toLowerCase();
  return businessData.emergencyKeywords.some((keyword) =>
    normalized.includes(keyword.toLowerCase())
  );
}

export function getMatchedEmergencyKeywords(text: string): string[] {
  const normalized = text.toLowerCase();
  return businessData.emergencyKeywords.filter((keyword) =>
    normalized.includes(keyword.toLowerCase())
  );
}
