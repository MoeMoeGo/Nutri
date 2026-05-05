import { ActivityLevel, Gender, Goal } from "@/types";
import { ACTIVITY_MULTIPLIERS } from "@/constants";


export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === "male" ? base + 5 : base - 161;
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

export function calculateDailyCalorieGoal(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender,
  activityLevel: ActivityLevel,
  goal: Goal
): number {
  const bmr = calculateBMR(weightKg, heightCm, age, gender);
  const tdee = calculateTDEE(bmr, activityLevel);
  const adjustment = goal === "lose" ? -500 : goal === "gain" ? 500 : 0;
  return Math.max(1200, tdee + adjustment);
}

export function calculateMacroTargets(dailyCalories: number) {
  return {
    proteinG: Math.round((dailyCalories * 0.3) / 4),
    carbsG: Math.round((dailyCalories * 0.4) / 4),
    fatG: Math.round((dailyCalories * 0.3) / 9),
  };
}
