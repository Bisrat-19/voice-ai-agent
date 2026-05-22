import { Request, Response } from "express";
import { testConnection } from "../config/database";

export async function healthCheck(_req: Request, res: Response): Promise<void> {
  let dbHealthy = false;
  try {
    dbHealthy = await testConnection();
  } catch {
    dbHealthy = false;
  }

  const status = dbHealthy ? "healthy" : "degraded";
  const statusCode = dbHealthy ? 200 : 503;

  res.status(statusCode).json({
    success: dbHealthy,
    status,
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealthy ? "up" : "down",
    },
  });
}
