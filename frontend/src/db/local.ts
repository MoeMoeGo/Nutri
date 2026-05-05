import * as SQLite from "expo-sqlite";
import { LocalFoodLog } from "@/types";

const DB_NAME = "calorieapp.db";

let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync(DB_NAME);
  }
  return _db;
}

export async function initLocalDb(): Promise<void> {
  const db = getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS food_logs_local (
      id                TEXT PRIMARY KEY,
      userId            TEXT NOT NULL,
      foodName          TEXT NOT NULL,
      brand             TEXT,
      calories          INTEGER NOT NULL DEFAULT 0,
      proteinG          REAL    NOT NULL DEFAULT 0,
      carbsG            REAL    NOT NULL DEFAULT 0,
      fatG              REAL    NOT NULL DEFAULT 0,
      fiberG            REAL,
      sodiumMg          REAL,
      servingSize       REAL    NOT NULL DEFAULT 1,
      servingUnit       TEXT    NOT NULL DEFAULT 'serving',
      servingMultiplier REAL    NOT NULL DEFAULT 1,
      mealType          TEXT    NOT NULL,
      logDate           TEXT    NOT NULL,
      loggedAt          TEXT    NOT NULL,
      external_food_id  TEXT,
      syncedAt          TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_local_user_date
      ON food_logs_local(userId, logDate);

    CREATE INDEX IF NOT EXISTS idx_local_unsynced
      ON food_logs_local(syncedAt)
      WHERE syncedAt IS NULL;
  `);
}

// Write 

export async function insertLocalLog(log: LocalFoodLog): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO food_logs_local
       (id, userId, foodName, brand, calories, proteinG, carbsG, fatG,
        fiberG, sodiumMg, servingSize, servingUnit, servingMultiplier,
        mealType, logDate, loggedAt, external_food_id, syncedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      log.id, log.userId, log.foodName, log.brand ?? null,
      log.calories, log.proteinG, log.carbsG, log.fatG,
      log.fiberG ?? null, log.sodiumMg ?? null,
      log.servingSize, log.servingUnit, log.servingMultiplier,
      log.mealType, log.logDate, log.loggedAt,
      log.external_food_id ?? null, log.syncedAt ?? null,
    ]
  );
}

export async function markSynced(id: string): Promise<void> {
  const db = getDb();
  await db.runAsync(
    "UPDATE food_logs_local SET syncedAt = ? WHERE id = ?",
    [new Date().toISOString(), id]
  );
}

export async function deleteLocalLog(id: string): Promise<void> {
  const db = getDb();
  await db.runAsync("DELETE FROM food_logs_local WHERE id = ?", [id]);
}

// Read 

export async function getLocalLogsForDate(userId: string, logDate: string): Promise<LocalFoodLog[]> {
  const db = getDb();
  return db.getAllAsync<LocalFoodLog>(
    "SELECT * FROM food_logs_local WHERE userId = ? AND logDate = ? ORDER BY loggedAt ASC",
    [userId, logDate]
  );
}

export async function getPendingLogs(userId: string): Promise<LocalFoodLog[]> {
  const db = getDb();
  return db.getAllAsync<LocalFoodLog>(
    "SELECT * FROM food_logs_local WHERE userId = ? AND syncedAt IS NULL ORDER BY loggedAt ASC",
    [userId]
  );
}

export async function getLocalLogById(id: string): Promise<LocalFoodLog | null> {
  const db = getDb();
  return db.getFirstAsync<LocalFoodLog>(
    "SELECT * FROM food_logs_local WHERE id = ?", [id]
  );
}