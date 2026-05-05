import { Response } from "express";
import { format, subDays } from "date-fns";
import { AuthRequest } from "@/middleware/auth.middleware";
import { foodLogQueries, userQueries, weightQueries } from "@/db/queries";
import { toWeightEntryDTO, toFoodLogDTO } from "@/utils/dto";

function toProgressRow(r: { log_date: Date|string; total_calories: number; total_protein_g: number; total_carbs_g: number; total_fat_g: number; entry_count: number }) {
  return {
    date: typeof r.log_date === "string" ? r.log_date : (r.log_date as Date).toISOString().split("T")[0],
    totalCalories: Number(r.total_calories), totalProteinG: Number(r.total_protein_g),
    totalCarbsG: Number(r.total_carbs_g),   totalFatG: Number(r.total_fat_g),
    entryCount: Number(r.entry_count),
  };
}

export async function getWeeklyProgress(req: AuthRequest, res: Response): Promise<void> {
  const startDate = (req.query.startDate as string) ?? format(subDays(new Date(), 6), "yyyy-MM-dd");
  const [rows, user] = await Promise.all([foodLogQueries.weeklyTotals(req.userId!, startDate), userQueries.findById(req.userId!)]);
  res.json({ startDate, goalCalories: user?.daily_calorie_goal ?? 2000, days: rows.map(toProgressRow) });
}

export async function getMonthlyProgress(req: AuthRequest, res: Response): Promise<void> {
  const now = new Date();
  const year  = parseInt((req.query.year  as string) ?? String(now.getFullYear()), 10);
  const month = parseInt((req.query.month as string) ?? String(now.getMonth() + 1), 10);
  
  if (month < 1 || month > 12) { res.status(400).json({ message: "month must be 1-12" }); return; }
  
  const pad = String(month).padStart(2, "0");


  const lastDay = new Date(year, month, 0).getDate(); 
  const startDateStr = `${year}-${pad}-01`;
  const endDateStr = `${year}-${pad}-${lastDay}`;

  const [calorieRows, weightRows, user] = await Promise.all([
    foodLogQueries.monthlyTotals(req.userId!, year, month),
    weightQueries.findByUserAndRange(req.userId!, startDateStr, endDateStr), 
    userQueries.findById(req.userId!),
  ]);
console.log(`Fetching for: ${startDateStr} to ${endDateStr}`);
  res.json({ 
    year, 
    month, 
    goalCalories: user?.daily_calorie_goal ?? 2000, 
    calories: calorieRows.map(toProgressRow), 
    weight: weightRows.map(toWeightEntryDTO) 
  });
}
export async function getRecentFoods(req: AuthRequest, res: Response): Promise<void> {
  const rows = await foodLogQueries.findRecent(req.userId!);
  res.json(rows.map(toFoodLogDTO));
}
