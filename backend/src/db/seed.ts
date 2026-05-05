import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool, query, queryOne } from "./pool";

const SEED_EMAIL = "dev@example.com";
const SEED_PASSWORD = "password123";

async function seed() {
  console.log("Seeding database...\n");

  const existing = await queryOne<{ id: string }>(
    "SELECT id FROM users WHERE email = $1",
    [SEED_EMAIL]
  );

  let userId: string;

  if (existing) {
    userId = existing.id;
    console.log(`  skip   user ${SEED_EMAIL} (already exists)`);
  } else {
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
    const row = await queryOne<{ id: string }>(
      `INSERT INTO users
         (email, password_hash, name, age, gender, weight_kg, height_cm,
          goal, activity_level, daily_calorie_goal)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [
        SEED_EMAIL, passwordHash, "Dev User",
        28, "male", 80, 178,
        "maintain", "moderate", 2400,
      ]
    );
    userId = row!.id;
    console.log(`  insert user ${SEED_EMAIL}  id=${userId}`);
  }

  const today = new Date().toISOString().split("T")[0];

  const samples = [
    {
      food_name: "Oatmeal with banana", meal_type: "breakfast",
      calories: 320, protein_g: 10, carbs_g: 58, fat_g: 5,
      serving_size: 1, serving_unit: "bowl",
    },
    {
      food_name: "Chicken breast", meal_type: "lunch",
      calories: 280, protein_g: 52, carbs_g: 0, fat_g: 6,
      serving_size: 200, serving_unit: "g",
    },
    {
      food_name: "Brown rice", meal_type: "lunch",
      calories: 215, protein_g: 5, carbs_g: 45, fat_g: 2,
      serving_size: 150, serving_unit: "g",
    },
    {
      food_name: "Greek yogurt", meal_type: "snack",
      calories: 120, protein_g: 17, carbs_g: 7, fat_g: 0,
      serving_size: 170, serving_unit: "g",
    },
  ];

  await query("DELETE FROM food_logs WHERE user_id = $1 AND log_date = $2", [userId, today]);

  for (const s of samples) {
    await query(
      `INSERT INTO food_logs
         (user_id, food_name, meal_type, calories, protein_g, carbs_g, fat_g,
          serving_size, serving_unit, serving_multiplier, log_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,$10)`,
      [userId, s.food_name, s.meal_type, s.calories, s.protein_g, s.carbs_g, s.fat_g,
       s.serving_size, s.serving_unit, today]
    );
    console.log(`  insert food_log "${s.food_name}" (${s.meal_type})`);
  }

  const weights = [
    { date: offsetDate(-6), kg: 80.5 },
    { date: offsetDate(-5), kg: 80.3 },
    { date: offsetDate(-4), kg: 80.1 },
    { date: offsetDate(-3), kg: 79.9 },
    { date: offsetDate(-2), kg: 80.0 },
    { date: offsetDate(-1), kg: 79.8 },
    { date: today,          kg: 79.7 },
  ];

  for (const w of weights) {
    await query(
      `INSERT INTO weight_entries (user_id, weight_kg, log_date)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, log_date) DO UPDATE SET weight_kg = $2`,
      [userId, w.kg, w.date]
    );
  }
  console.log(`  insert 7 weight entries`);

  console.log("\nSeed complete.");
  console.log(`\nLogin with:\n  email:    ${SEED_EMAIL}\n  password: ${SEED_PASSWORD}`);
}

function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error("Seed failed:", err);
    pool.end().finally(() => process.exit(1));
  });
