import { pool } from "../config/database";
import type {
  CallRecord,
  CallRecordRow,
  PaginatedResult,
  StructuredCallData,
} from "../types";

function mapRowToCallRecord(row: CallRecordRow): CallRecord {
  return {
    id: row.id,
    callId: row.call_id,
    callerPhone: row.caller_phone ?? "",
    intent: (row.intent ?? "unknown_request") as CallRecord["intent"],
    serviceNeeded: row.service_needed ?? "",
    customerName: row.customer_name ?? "",
    addressOrCity: row.address_or_city ?? "",
    preferredTime: row.preferred_time ?? "",
    isEmergency: row.is_emergency,
    summary: row.summary ?? "",
    transcript: row.transcript ?? "",
    createdAt: row.created_at,
  };
}

export async function insertCall(
  callId: string,
  data: StructuredCallData
): Promise<CallRecord> {
  const result = await pool.query<CallRecordRow>(
    `INSERT INTO calls (
      call_id, caller_phone, intent, service_needed, customer_name,
      address_or_city, preferred_time, is_emergency, summary, transcript
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (call_id) DO UPDATE SET
      caller_phone = EXCLUDED.caller_phone,
      intent = EXCLUDED.intent,
      service_needed = EXCLUDED.service_needed,
      customer_name = EXCLUDED.customer_name,
      address_or_city = EXCLUDED.address_or_city,
      preferred_time = EXCLUDED.preferred_time,
      is_emergency = EXCLUDED.is_emergency,
      summary = EXCLUDED.summary,
      transcript = EXCLUDED.transcript
    RETURNING *`,
    [
      callId,
      data.callerPhone || null,
      data.intent,
      data.serviceNeeded || null,
      data.customerName || null,
      data.addressOrCity || null,
      data.preferredTime || null,
      data.isEmergency,
      data.summary || null,
      data.transcript || null,
    ]
  );

  return mapRowToCallRecord(result.rows[0]);
}

export async function findCallByCallId(callId: string): Promise<CallRecord | null> {
  const result = await pool.query<CallRecordRow>(
    "SELECT * FROM calls WHERE call_id = $1",
    [callId]
  );
  return result.rows[0] ? mapRowToCallRecord(result.rows[0]) : null;
}

export async function listCalls(
  page: number,
  limit: number
): Promise<PaginatedResult<CallRecord>> {
  const offset = (page - 1) * limit;

  const [countResult, dataResult] = await Promise.all([
    pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM calls"),
    pool.query<CallRecordRow>(
      "SELECT * FROM calls ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [limit, offset]
    ),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);

  return {
    data: dataResult.rows.map(mapRowToCallRecord),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}
