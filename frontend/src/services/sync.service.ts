import { apiClient } from "./api.client";
import { getPendingLogs, markSynced } from "@/db/local";
import { useAuthStore } from "@/store/auth.store";
import { LocalFoodLog } from "@/types";

export interface SyncResult {
  synced: number;
  skipped: number;
  failed: number;
}

function isValidLog(log: LocalFoodLog): boolean {
  return (
    typeof log.mealType === "string" && log.mealType.length > 0 &&
    typeof log.logDate === "string" && log.logDate.length > 0 &&
    typeof log.foodName === "string" && log.foodName.length > 0 &&
    typeof log.userId === "string" && log.userId.length > 0
  );
}

export async function flushPendingLogs(): Promise<SyncResult> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return { synced: 0, skipped: 0, failed: 0 };

  const pending = await getPendingLogs(userId);

 
  if (pending.length > 0) {
    console.log("🔍 [sync] RAW DATABASE ROWS:", JSON.stringify(pending, null, 2));
  }

  if (pending.length === 0) return { synced: 0, skipped: 0, failed: 0 };
  const valid = pending.filter(isValidLog);
  const invalid = pending.filter((l) => !isValidLog(l));

  if (invalid.length > 0) {
    console.warn(
      `[sync] Dropping ${invalid.length} malformed row(s):`,
      invalid.map((l) => ({ id: l.id, mealType: l.mealType, logDate: l.logDate }))
    );
    await Promise.all(invalid.map((l) => markSynced(l.id)));
  }

  if (valid.length === 0) return { synced: 0, skipped: invalid.length, failed: 0 };

  try {
    const { data } = await apiClient.post<{
      synced: number;
      skipped: number;
      entries: Array<{ clientId: string }>;
    }>("/food/sync", {
      entries: valid.map((log) => ({
        clientId: log.id,
        foodName: log.foodName,
        brand: log.brand ?? null,
        calories: log.calories,
        proteinG: log.proteinG,
        carbsG: log.carbsG,
        fatG: log.fatG,
        fiberG: log.fiberG ?? null,
        sodiumMg: log.sodiumMg ?? null,
        servingSize: log.servingSize,
        servingUnit: log.servingUnit,
        servingMultiplier: log.servingMultiplier,
        mealType: log.mealType,
        logDate: log.logDate,
        external_food_id: log.external_food_id ?? null,
      })),
    });

    const syncedIds = new Set(data.entries.map((e) => e.clientId));
    await Promise.all(
      valid
        .filter((l) => syncedIds.has(l.id) || data.skipped > 0)
        .map((l) => markSynced(l.id))
    );

    return { synced: data.synced, skipped: data.skipped + invalid.length, failed: 0 };
  } catch (err) {
    console.warn("[sync] Flush failed — will retry:", err);
    return { synced: 0, skipped: invalid.length, failed: valid.length };
  }
}