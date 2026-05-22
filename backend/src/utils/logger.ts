type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  requestId?: string;
  [key: string]: unknown;
}

export function log(payload: LogPayload): void {
  const entry = {
    ...payload,
    timestamp: new Date().toISOString(),
    service: "abc-home-services-backend",
  };
  const output = JSON.stringify(entry);
  if (payload.level === "error") {
    console.error(output);
  } else if (payload.level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export function logInfo(message: string, meta?: Record<string, unknown>): void {
  log({ level: "info", message, ...meta });
}

export function logError(message: string, meta?: Record<string, unknown>): void {
  log({ level: "error", message, ...meta });
}

export function logWarn(message: string, meta?: Record<string, unknown>): void {
  log({ level: "warn", message, ...meta });
}
