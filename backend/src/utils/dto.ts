import { UserRow, FoodLogRow, WeightEntryRow, PushTokenRow } from "@/db/queries";

export function toUserDTO(row: UserRow) {
  return {
    id: row.id, email: row.email, name: row.name, age: row.age, gender: row.gender,
    weightKg: row.weight_kg !== null ? Number(row.weight_kg) : null,
    heightCm: row.height_cm !== null ? Number(row.height_cm) : null,
    goal: row.goal, activityLevel: row.activity_level,
    dailyCalorieGoal: row.daily_calorie_goal,
    onboardingCompleted: row.onboarding_completed,
    notifyBreakfast: row.notify_breakfast, notifyLunch: row.notify_lunch,
    notifyDinner: row.notify_dinner,       notifySummary: row.notify_summary,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export function toFoodLogDTO(row: FoodLogRow) {
  return {
    id: row.id, userId: row.user_id, clientId: row.client_id,
    foodName: row.food_name, brand: row.brand,
    calories: Number(row.calories), proteinG: Number(row.protein_g),
    carbsG: Number(row.carbs_g),   fatG: Number(row.fat_g),
    fiberG:    row.fiber_g   !== null ? Number(row.fiber_g)   : null,
    sodiumMg:  row.sodium_mg !== null ? Number(row.sodium_mg) : null,
    servingSize: Number(row.serving_size), servingUnit: row.serving_unit,
    servingMultiplier: Number(row.serving_multiplier),
    mealType: row.meal_type, logDate: row.log_date, loggedAt: row.logged_at,
    imageUrl: row.image_url, externalFoodId: row.external_food_id,
  };
}

export function toWeightEntryDTO(row: WeightEntryRow) {
  return { id: row.id, userId: row.user_id, weightKg: Number(row.weight_kg), logDate: row.log_date, loggedAt: row.logged_at };
}
export function toPushTokenDTO(row: PushTokenRow) {
  return { id: row.id, userId: row.user_id, token: row.token, platform: row.platform, createdAt: row.created_at };
}