export interface CallRecord {
  id: number;
  callId: string;
  callerPhone: string;
  intent: string;
  serviceNeeded: string;
  customerName: string;
  addressOrCity: string;
  preferredTime: string;
  isEmergency: boolean;
  summary: string;
  transcript: string;
  createdAt: string;
}

export interface CallsResponse {
  success: boolean;
  data: CallRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
