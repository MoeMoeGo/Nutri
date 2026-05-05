import { Response } from "express";
import { AuthRequest } from "@/middleware/auth.middleware";
import { foodLogQueries, userQueries } from "@/db/queries";
import { toFoodLogDTO } from "@/utils/dto";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export async function logFood(req: AuthRequest, res: Response): Promise<void> {
  const {
    foodName, brand, calories, proteinG, carbsG, fatG,
    fiberG, sodiumMg, servingSize, servingUnit,
    servingMultiplier = 1, mealType, date, imageUrl, externalFoodId,
  } = req.body;

  const logDate = date ?? new Date().toISOString().split("T")[0];
  const mult = Number(servingMultiplier);

  const row = await foodLogQueries.insert({
    userId: req.userId!,
    foodName,
    brand,
    calories: Math.round(Number(calories) * mult),
    proteinG: Number(proteinG) * mult,
    carbsG: Number(carbsG) * mult,
    fatG: Number(fatG) * mult,
    fiberG: fiberG != null ? Number(fiberG) * mult : undefined,
    sodiumMg: sodiumMg != null ? Number(sodiumMg) * mult : undefined,
    servingSize: Number(servingSize),
    servingUnit,
    servingMultiplier: mult,
    mealType,
    logDate,
    imageUrl,
    externalFoodId,
  });

  res.status(201).json(row ? toFoodLogDTO(row) : {});
}

export async function getDailySummary(req: AuthRequest, res: Response): Promise<void> {
  const logDate = (req.query.date as string) ?? new Date().toISOString().split("T")[0];

  const [logs, totalsRow, user] = await Promise.all([
    foodLogQueries.findByUserAndDate(req.userId!, logDate),
    foodLogQueries.dailyTotals(req.userId!, logDate),
    userQueries.findById(req.userId!),
  ]);

  const goalCalories = user?.daily_calorie_goal ?? 2000;
  const totals = {
    totalCalories: Number(totalsRow?.total_calories ?? 0),
    totalProteinG: Number(totalsRow?.total_protein_g ?? 0),
    totalCarbsG: Number(totalsRow?.total_carbs_g ?? 0),
    totalFatG: Number(totalsRow?.total_fat_g ?? 0),
  };

  const logsByMeal = MEAL_TYPES.reduce((acc, meal) => ({
    ...acc,
    [meal]: logs.filter((l) => l.meal_type === meal).map(toFoodLogDTO),
  }), {} as Record<MealType, ReturnType<typeof toFoodLogDTO>[]>);

  res.json({
    date: logDate,
    ...totals,
    goalCalories,
    remainingCalories: goalCalories - totals.totalCalories,
    logsByMeal,
  });
}

export async function getFoodLogs(req: AuthRequest, res: Response): Promise<void> {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    res.status(400).json({ message: "startDate and endDate query params are required" });
    return;
  }

  const logs = await foodLogQueries.findByUserAndDateRange(
    req.userId!,
    startDate as string,
    endDate as string
  );
  res.json(logs.map(toFoodLogDTO));
}

export async function updateFoodLog(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const existing = await foodLogQueries.findByIdAndUser(id, req.userId!);
  if (!existing) { res.status(404).json({ message: "Log entry not found" }); return; }

  const { servingMultiplier, mealType } = req.body;
  const updateFields: Parameters<typeof foodLogQueries.update>[1] = {};

  if (mealType !== undefined) updateFields.meal_type = mealType;

  if (servingMultiplier !== undefined) {
    const newMult = Number(servingMultiplier);
    const oldMult = Number(existing.serving_multiplier);
    updateFields.serving_multiplier = newMult;
    updateFields.calories = Math.round((Number(existing.calories) / oldMult) * newMult);
    updateFields.protein_g = (Number(existing.protein_g) / oldMult) * newMult;
    updateFields.carbs_g = (Number(existing.carbs_g) / oldMult) * newMult;
    updateFields.fat_g = (Number(existing.fat_g) / oldMult) * newMult;
  }

  const updated = await foodLogQueries.update(id, updateFields);
  res.json(updated ? toFoodLogDTO(updated) : {});
}

export async function deleteFoodLog(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const existing = await foodLogQueries.findByIdAndUser(id, req.userId!);
  if (!existing) { res.status(404).json({ message: "Log entry not found" }); return; }

  await foodLogQueries.delete(id);
  res.status(204).send();
}