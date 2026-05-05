import { Response } from "express";
import { body, query as qv, validationResult } from "express-validator";
import { AuthRequest } from "@/middleware/auth.middleware";
import { weightQueries } from "@/db/queries";
import { toWeightEntryDTO } from "@/utils/dto";

export async function logWeight(req: AuthRequest, res: Response): Promise<void> {
  const { weightKg, date } = req.body;
  const logDate = date ?? new Date().toISOString().split("T")[0];

  const row = await weightQueries.upsert(req.userId!, Number(weightKg), logDate);
  if (!row) { res.status(500).json({ message: "Failed to save weight entry" }); return; }

  res.status(201).json(toWeightEntryDTO(row));
}

export async function getWeightHistory(req: AuthRequest, res: Response): Promise<void> {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    res.status(400).json({ message: "startDate and endDate query params are required" });
    return;
  }

  const rows = await weightQueries.findByUserAndRange(
    req.userId!,
    startDate as string,
    endDate as string
  );

  res.json(rows.map(toWeightEntryDTO));
}
