import app from "./app";
import { env } from "./config/env";
import { runMigrations } from "./db/migrate";
import { logInfo, logError } from "./utils/logger";

async function start(): Promise<void> {
  try {
    await runMigrations();
    app.listen(env.port, () => {
      const base = `http://localhost:${env.hostPort}`;
      logInfo(`Backend API → ${base}`, {
        health: `${base}/health`,
        webhook: `${base}/vapi/call-ended`,
      });
    });
  } catch (err) {
    logError("Failed to start", { error: err instanceof Error ? err.message : String(err) });
    process.exit(1);
  }
}

start();
