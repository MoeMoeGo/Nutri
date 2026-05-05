export type Goal = "lose" | "maintain" | "gain";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Gender = "male" | "female" | "other";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type Platform = "ios" | "android";

export interface User {
  id: string; email: string; name: string;
  age?: number; gender?: Gender;
  weightKg?: number | null; heightCm?: number | null;
  goal?: Goal; activityLevel?: ActivityLevel; dailyCalorieGoal?: number;
  onboardingCompleted: boolean;
  notifyBreakfast: boolean; notifyLunch: boolean;
  notifyDinner: boolean; notifySummary: boolean;
  createdAt: string; updatedAt: string;
}

export interface AuthTokens { accessToken: string; refreshToken: string; }
export interface AuthResponse { user: User; tokens: AuthTokens; }

export interface Macros {
  calories: number; proteinG: number; carbsG: number; fatG: number;
  fiberG?: number | null; sodiumMg?: number | null;
}

export interface FoodItem extends Macros {
  id: string; name: string; brand?: string | null;
  servingSize: number; servingUnit: string;
  imageUrl?: string | null; external_food_id?: string | null;
}

export interface FoodLog extends Macros {
  id: string; userId: string; clientId?: string | null;
  foodName: string; brand?: string | null;
  servingSize: number; servingUnit: string; servingMultiplier: number;
  mealType: MealType; logDate: string; loggedAt: string;
  imageUrl?: string | null; external_food_id?: string | null;
}

export interface LocalFoodLog {
  id: string; userId: string; foodName: string; brand: string | null;
  calories: number; proteinG: number; carbsG: number; fatG: number;
  fiberG: number | null; sodiumMg: number | null;
  servingSize: number; servingUnit: string; servingMultiplier: number;
  mealType: MealType; logDate: string; loggedAt: string;
  external_food_id: string | null; syncedAt: string | null;
}

export interface DailySummary {
  date: string; totalCalories: number; totalProteinG: number;
  totalCarbsG: number; totalFatG: number;
  goalCalories: number; remainingCalories: number;
  logsByMeal: Record<MealType, FoodLog[]>;
}

export interface WeightEntry {
  id: string; userId: string; weightKg: number; logDate: string; loggedAt: string;
}

export interface DayProgress {
  date: string; totalCalories: number; totalProteinG: number;
  totalCarbsG: number; totalFatG: number; entryCount: number;
}

export interface WeeklyProgress {
  startDate: string; goalCalories: number; days: DayProgress[];
}

export interface MonthlyProgress {
  year: number; month: number; goalCalories: number;
  calories: DayProgress[]; weight: WeightEntry[];
}
