import { readFile } from "fs/promises";
import path from "path";
import { pool } from "../config/database";
import { logInfo, logError } from "../utils/logger";

export async function runMigrations(): Promise<void> {
  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = await readFile(schemaPath, "utf-8");

  const client = await pool.connect();
  try {
    await client.query(sql);
    logInfo("Database migrations completed");
  } catch (err) {
    logError("Database migration failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  } finally {
    client.release();
  }
}
