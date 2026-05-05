
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

export const QUERY_KEYS = {
  profile:         ["profile"] as const,
  dailySummary:    (date: string)  => ["dailySummary",   date]  as const,
  foodLogs:        (date: string)  => ["foodLogs",        date]  as const,
  foodSearch:      (q: string)     => ["foodSearch",      q]     as const,
  recentFoods:     ["recentFoods"] as const,
  weeklyProgress:  (start: string) => ["weeklyProgress",  start] as const,
  monthlyProgress: (y: number, m: number) => ["monthlyProgress", y, m] as const,
  weightHistory:   (range: string) => ["weightHistory",   range] as const,
} as const;
export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export const MEAL_LABELS: Record<string, string> = { breakfast:"Breakfast", lunch:"Lunch", dinner:"Dinner", snack:"Snack" };
export const MEAL_EMOJI:  Record<string, string> = { breakfast:"🌅", lunch:"☀️", dinner:"🌙", snack:"🍎" };

export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
} as const;

export const COLORS = {
  primary: "#16a34a",
  primaryLight: "#bbf7d0",
  protein: "#3b82f6",
  carbs: "#f59e0b",
  fat: "#ef4444",
  muted: "#6b7280",
  border: "#e5e7eb",
  background: "#f9fafb",
  card: "#ffffff",
} as const;

export const STORAGE_KEYS = {
  accessToken: "access_token",
  refreshToken: "refresh_token",
  userId: "user_id",
  user: "user_object",
  units: "unit_preferences",
} as const;

export const SYNC_TASK_NAME = "BACKGROUND_SYNC";
