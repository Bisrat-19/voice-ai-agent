import { Request, Response } from "express";
import { listCalls } from "../services/database.service";
import { parsePagination } from "../utils/validation";

export async function getCalls(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req.query as { page?: string; limit?: string });
  const result = await listCalls(page, limit);
  res.status(200).json({ success: true, ...result });
}
