import type { SupportedIntent } from "../data/business";

export interface VapiCallEndedPayload {
  callId: string;
  callerPhone?: string;
  summary?: string;
  transcript?: string;
}

export interface StructuredCallData {
  callerPhone: string;
  intent: SupportedIntent;
  serviceNeeded: string;
  customerName: string;
  addressOrCity: string;
  preferredTime: string;
  isEmergency: boolean;
  summary: string;
  transcript: string;
}

export interface CallRecord extends StructuredCallData {
  id: number;
  callId: string;
  createdAt: Date;
}

export interface CallRecordRow {
  id: number;
  call_id: string;
  caller_phone: string | null;
  intent: string | null;
  service_needed: string | null;
  customer_name: string | null;
  address_or_city: string | null;
  preferred_time: string | null;
  is_emergency: boolean;
  summary: string | null;
  transcript: string | null;
  created_at: Date;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
