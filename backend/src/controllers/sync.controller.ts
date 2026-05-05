import { Response } from "express";
import { AuthRequest } from "@/middleware/auth.middleware";
import { foodLogQueries } from "@/db/queries"; 
import { toFoodLogDTO } from "@/utils/dto";    

export async function batchSync(req: AuthRequest, res: Response): Promise<void> {
  const entries = req.body.entries;
  
  if (!Array.isArray(entries) || entries.length === 0) {
    res.status(400).json({ message: "entries must be a non-empty array" });
    return;
  }
  
  if (entries.length > 500) {
    res.status(400).json({ message: "Max 500 entries per batch" });
    return;
  }


  const logsToInsert = entries.map((e: any) => ({
    userId: req.userId!,
    clientId: e.clientId,
    foodName: e.foodName || e.name || "Unknown Food", 
    brand: e.brand,
    calories: Math.round(Number(e.calories) || 0),
    proteinG: Number(e.proteinG) || 0,
    carbsG: Number(e.carbsG) || 0,
    fatG: Number(e.fatG) || 0,
    fiberG: e.fiberG ? Number(e.fiberG) : 0,
    sodiumMg: e.sodiumMg ? Number(e.sodiumMg) : 0,
    servingSize: Number(e.servingSize) || 1,
    servingUnit: e.servingUnit || "serving",
    servingMultiplier: Number(e.servingMultiplier) || 1,
    mealType: e.mealType,
    logDate: e.logDate,
    external_food_id: e.external_food_id,
  }));

  try {
    const results = await foodLogQueries.batchInsert(logsToInsert);
    const inserted = results.filter(Boolean);

    res.json({ 
      synced: inserted.length, 
      skipped: entries.length - inserted.length, 
      entries: inserted.map((r: any) => toFoodLogDTO(r)) 
    });
  } catch (error) {
    console.error("Batch Sync Error:", error);
    res.status(500).json({ message: "Internal Server Error during sync" });
  }
}