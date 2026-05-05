import { apiClient } from "./api.client";
import { FoodItem, MealType, LocalFoodLog } from "@/types";
import { insertLocalLog } from "@/db/local"
import { flushPendingLogs } from "./sync.service";
import { useAuthStore } from "@/store/auth.store";
import * as Network from "expo-network";
import * as Crypto from "expo-crypto";

export interface LogFoodPayload {
  foodName: string;
  brand?: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  servingSize: number;
  servingUnit: string;
  servingMultiplier: number;
  mealType: MealType;
  date?: string;
  external_food_id?: string;
}

const nutritionService = {
  search: async (query: string): Promise<FoodItem[]> => {
    const { data } = await apiClient.get<{ foods: FoodItem[] }>(
      `/nutrition/search?q=${encodeURIComponent(query)}`
    );
    return data.foods;
  },

  searchByBarcode: async (upc: string): Promise<FoodItem[]> => {
    const { data } = await apiClient.get<{ foods: FoodItem[] }>(
      `/nutrition/search?upc=${encodeURIComponent(upc)}`
    );
    return data.foods;
  },

  logFood: async (payload: LogFoodPayload): Promise<LocalFoodLog> => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      throw new Error("Cannot log food: user is not authenticated");
    }

    const logDate  = payload.date ?? new Date().toISOString().split("T")[0];
    const clientId = await Crypto.randomUUID();
    const now      = new Date().toISOString();
    const mult     = payload.servingMultiplier;

    const localLog: LocalFoodLog = {
      id:                clientId,
      userId,
      foodName:          payload.foodName,
      brand:             payload.brand        ?? null,
      calories:          Math.round(payload.calories * mult),
      proteinG:          payload.proteinG     * mult,
      carbsG:            payload.carbsG       * mult,
      fatG:              payload.fatG         * mult,
      fiberG:            payload.fiberG != null ? payload.fiberG * mult : null,
      sodiumMg:          null,
      servingSize:       payload.servingSize,
      servingUnit:       payload.servingUnit,
      servingMultiplier: mult,
      mealType:          payload.mealType,
      logDate,
      loggedAt:          now,
      external_food_id:          payload.external_food_id     ?? null,
      syncedAt:          null,
    };


    await insertLocalLog(localLog);


    try {
      const net = await Network.getNetworkStateAsync();
      if (net.isInternetReachable) {
        await flushPendingLogs();
      }
    } catch {
    }

    return localLog;
  },
};

export default nutritionService;