import { PoolClient } from "pg";
import { query, queryOne } from "./pool";

export interface UserRow {
  id: string; email: string; password_hash: string | null; name: string;
  age: number | null; gender: string | null; weight_kg: number | null;
  height_cm: number | null; goal: string | null; activity_level: string | null;
  daily_calorie_goal: number | null; onboarding_completed: boolean;
  google_id: string | null; apple_id: string | null;
  notify_breakfast: boolean; notify_lunch: boolean;
  notify_dinner: boolean; notify_summary: boolean;
  created_at: Date; updated_at: Date;
}

export interface RefreshTokenRow {
  id: string; token: string; user_id: string; expires_at: Date; created_at: Date;
}

export interface FoodLogRow {
  id: string; user_id: string; client_id: string | null; food_name: string;
  brand: string | null; calories: number; protein_g: number; carbs_g: number;
  fat_g: number; fiber_g: number | null; sodium_mg: number | null;
  serving_size: number; serving_unit: string; serving_multiplier: number;
  meal_type: string; log_date: Date; logged_at: Date;
  image_url: string | null; external_food_id: string | null;
}

export interface WeightEntryRow {
  id: string; user_id: string; weight_kg: number; log_date: Date; logged_at: Date;
}

export interface PushTokenRow {
  id: string; user_id: string; token: string; platform: string; created_at: Date;
}

export interface DailyTotalsRow {
  log_date: Date; total_calories: number; total_protein_g: number;
  total_carbs_g: number; total_fat_g: number; entry_count: number;
}

export const userQueries = {
  findByEmail: (email: string) =>
    queryOne<UserRow>("SELECT * FROM users WHERE email = $1", [email]),
  findById: (id: string) =>
    queryOne<UserRow>("SELECT * FROM users WHERE id = $1", [id]),
  findByEmailOrGoogleId: (email: string, googleId: string) =>
    queryOne<UserRow>("SELECT * FROM users WHERE email = $1 OR google_id = $2 LIMIT 1", [email, googleId]),
  findByEmailOrAppleId: (email: string, appleId: string) =>
    queryOne<UserRow>("SELECT * FROM users WHERE email = $1 OR apple_id = $2 LIMIT 1", [email, appleId]),
  create: (params: { email: string; passwordHash?: string; name: string; googleId?: string; appleId?: string }) =>
    queryOne<UserRow>(
      `INSERT INTO users (email, password_hash, name, google_id, apple_id) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [params.email, params.passwordHash ?? null, params.name, params.googleId ?? null, params.appleId ?? null]
    ),
  updateSocialId: (id: string, field: "google_id" | "apple_id", value: string) =>
    queryOne<UserRow>(`UPDATE users SET ${field} = $2 WHERE id = $1 RETURNING *`, [id, value]),
  updateProfile: (id: string, fields: Record<string, unknown>) => {
    const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return queryOne<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
    const set = entries.map(([col], i) => `${col} = $${i + 2}`).join(", ");
    return queryOne<UserRow>(`UPDATE users SET ${set} WHERE id = $1 RETURNING *`, [id, ...entries.map(([, v]) => v)]);
  },
  findUsersToNotify: (mealType: "breakfast" | "lunch" | "dinner" | "summary") => {
    const col = `notify_${mealType}`;
    if (mealType === "summary") return query<{ id: string }>(`SELECT id FROM users WHERE ${col} = TRUE`, []);
    return query<{ id: string }>(
      `SELECT u.id FROM users u WHERE u.${col} = TRUE AND NOT EXISTS (
        SELECT 1 FROM food_logs fl WHERE fl.user_id = u.id AND fl.meal_type = $1 AND fl.log_date = CURRENT_DATE
      )`, [mealType]
    );
  },
};

export const tokenQueries = {
  create: (client: PoolClient, p: { token: string; userId: string; expiresAt: Date }) =>
    client.query("INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1,$2,$3)", [p.token, p.userId, p.expiresAt]),
  findByToken: (token: string) =>
    queryOne<RefreshTokenRow>("SELECT * FROM refresh_tokens WHERE token = $1", [token]),
  deleteByToken: (client: PoolClient, token: string) =>
    client.query("DELETE FROM refresh_tokens WHERE token = $1", [token]),
  deleteExpired: () => query("DELETE FROM refresh_tokens WHERE expires_at < NOW()", []),
};

export const foodLogQueries = {
  insert: (p: {
    userId: string; clientId?: string; foodName: string; brand?: string;
    calories: number; proteinG: number; carbsG: number; fatG: number;
    fiberG?: number; sodiumMg?: number; servingSize: number; servingUnit: string;
    servingMultiplier: number; mealType: string; logDate: string;
    imageUrl?: string; externalFoodId?: string;
  }) =>
    queryOne<FoodLogRow>(
      `INSERT INTO food_logs
        (user_id,client_id,food_name,brand,calories,protein_g,carbs_g,fat_g,
         fiber_g,sodium_mg,serving_size,serving_unit,serving_multiplier,meal_type,log_date,image_url,external_food_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (client_id) WHERE client_id IS NOT NULL DO NOTHING
       RETURNING *`,
      [p.userId,p.clientId??null,p.foodName,p.brand??null,p.calories,
       p.proteinG,p.carbsG,p.fatG,p.fiberG??null,p.sodiumMg??null,
       p.servingSize,p.servingUnit,p.servingMultiplier,p.mealType,p.logDate,
       p.imageUrl??null,p.externalFoodId??null]
    ),
  batchInsert: null as unknown as (logs: {
    userId: string; clientId?: string; foodName: string; brand?: string;
    calories: number; proteinG: number; carbsG: number; fatG: number;
    fiberG?: number; sodiumMg?: number; servingSize: number; servingUnit: string;
    servingMultiplier: number; mealType: string; logDate: string;
    imageUrl?: string; externalFoodId?: string;
  }[]) => Promise<FoodLogRow[]>,
  findByUserAndDate: (userId: string, logDate: string) =>
    query<FoodLogRow>("SELECT * FROM food_logs WHERE user_id=$1 AND log_date=$2 ORDER BY logged_at ASC", [userId, logDate]),
  findByUserAndDateRange: (userId: string, start: string, end: string) =>
    query<FoodLogRow>("SELECT * FROM food_logs WHERE user_id=$1 AND log_date BETWEEN $2 AND $3 ORDER BY log_date DESC, logged_at ASC", [userId, start, end]),
  findRecent: (userId: string) =>
    query<FoodLogRow>(
      `SELECT DISTINCT ON (food_name,brand) id,user_id,client_id,food_name,brand,calories,
         protein_g,carbs_g,fat_g,fiber_g,sodium_mg,serving_size,serving_unit,serving_multiplier,
         meal_type,log_date,logged_at,image_url,external_food_id
       FROM food_logs WHERE user_id=$1 ORDER BY food_name,brand,logged_at DESC LIMIT 20`, [userId]
    ),
  dailyTotals: (userId: string, logDate: string) =>
    queryOne<{ total_calories: number; total_protein_g: number; total_carbs_g: number; total_fat_g: number }>(
      `SELECT COALESCE(SUM(calories),0) AS total_calories, COALESCE(SUM(protein_g),0) AS total_protein_g,
              COALESCE(SUM(carbs_g),0) AS total_carbs_g,   COALESCE(SUM(fat_g),0)     AS total_fat_g
       FROM food_logs WHERE user_id=$1 AND log_date=$2`, [userId, logDate]
    ),
  weeklyTotals: (userId: string, startDate: string) =>
    query<DailyTotalsRow>(
      `SELECT d.day::DATE AS log_date,
         COALESCE(SUM(fl.calories),0)::INT     AS total_calories,
         COALESCE(SUM(fl.protein_g),0)::NUMERIC AS total_protein_g,
         COALESCE(SUM(fl.carbs_g),0)::NUMERIC   AS total_carbs_g,
         COALESCE(SUM(fl.fat_g),0)::NUMERIC     AS total_fat_g,
         COUNT(fl.id)::INT                       AS entry_count
       FROM generate_series($2::DATE, $2::DATE + INTERVAL '6 days', INTERVAL '1 day') AS d(day)
       LEFT JOIN food_logs fl ON fl.log_date=d.day AND fl.user_id=$1
       GROUP BY d.day ORDER BY d.day ASC`, [userId, startDate]
    ),
  monthlyTotals: (userId: string, year: number, month: number) =>
    query<DailyTotalsRow>(
      `SELECT d.day::DATE AS log_date,
         COALESCE(SUM(fl.calories),0)::INT     AS total_calories,
         COALESCE(SUM(fl.protein_g),0)::NUMERIC AS total_protein_g,
         COALESCE(SUM(fl.carbs_g),0)::NUMERIC   AS total_carbs_g,
         COALESCE(SUM(fl.fat_g),0)::NUMERIC     AS total_fat_g,
         COUNT(fl.id)::INT                       AS entry_count
       FROM generate_series(make_date($2,$3,1), make_date($2,$3,1) + INTERVAL '1 month' - INTERVAL '1 day', INTERVAL '1 day') AS d(day)
       LEFT JOIN food_logs fl ON fl.log_date=d.day AND fl.user_id=$1
       GROUP BY d.day ORDER BY d.day ASC`, [userId, year, month]
    ),
  findByIdAndUser: (id: string, userId: string) =>
    queryOne<FoodLogRow>("SELECT * FROM food_logs WHERE id=$1 AND user_id=$2", [id, userId]),
  update: (id: string, fields: Record<string, unknown>) => {
    const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
    const set = entries.map(([col], i) => `${col} = $${i + 2}`).join(", ");
    return queryOne<FoodLogRow>(`UPDATE food_logs SET ${set} WHERE id=$1 RETURNING *`, [id, ...entries.map(([, v]) => v)]);
  },
  delete: (id: string) => query("DELETE FROM food_logs WHERE id=$1", [id]),
};


foodLogQueries.batchInsert = async (logs: Parameters<typeof foodLogQueries.insert>[0][]): Promise<FoodLogRow[]> => {
  const results = await Promise.all(logs.map((l) => foodLogQueries.insert(l)));
  return results.filter((r): r is FoodLogRow => r !== null);
};

export const weightQueries = {
  upsert: (userId: string, weightKg: number, logDate: string) =>
    queryOne<WeightEntryRow>(
      `INSERT INTO weight_entries (user_id,weight_kg,log_date) VALUES ($1,$2,$3)
       ON CONFLICT (user_id,log_date) DO UPDATE SET weight_kg=$2, logged_at=NOW() RETURNING *`,
      [userId, weightKg, logDate]
    ),
  findByUserAndRange: (userId: string, start: string, end: string) =>
    query<WeightEntryRow>("SELECT * FROM weight_entries WHERE user_id=$1 AND log_date BETWEEN $2 AND $3 ORDER BY log_date ASC", [userId, start, end]),
};

export const pushTokenQueries = {
  upsert: (userId: string, token: string, platform: string) =>
    queryOne<PushTokenRow>(
      `INSERT INTO push_tokens (user_id,token,platform) VALUES ($1,$2,$3)
       ON CONFLICT (token) DO UPDATE SET user_id=$1, platform=$3 RETURNING *`,
      [userId, token, platform]
    ),
  findByUser: (userId: string) =>
    query<PushTokenRow>("SELECT * FROM push_tokens WHERE user_id=$1", [userId]),
  findAllForUsers: (userIds: string[]) =>
    query<PushTokenRow>("SELECT * FROM push_tokens WHERE user_id = ANY($1::TEXT[])", [userIds]),
  deleteByToken: (token: string) =>
    query("DELETE FROM push_tokens WHERE token=$1", [token]),
};