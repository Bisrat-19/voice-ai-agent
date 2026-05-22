export const businessData = {
  businessName: "ABC Home Services",
  services: [
    "HVAC repair",
    "plumbing",
    "water heater repair",
    "electrical inspection",
  ],
  serviceAreas: ["Denver", "Aurora", "Lakewood"],
  pricing: {
    "HVAC inspection": "$89",
    "plumbing diagnostic": "$75",
  },
  emergencyKeywords: ["burst pipe", "gas leak", "flooding", "no heat"],
} as const;

export type SupportedIntent =
  | "booking_request"
  | "emergency"
  | "pricing_question"
  | "service_area_question"
  | "unknown_request";
