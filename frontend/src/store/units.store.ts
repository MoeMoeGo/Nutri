import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {STORAGE_KEYS} from "@/constants";

export type WeightUnit  = "kg"   | "lbs";
export type EnergyUnit  = "kcal" | "cal";

export interface UnitPreferences {
  weight: WeightUnit;
  energy: EnergyUnit;
}

interface UnitsState extends UnitPreferences {
  isLoaded: boolean;
  setWeight: (u: WeightUnit) => Promise<void>;
  setEnergy: (u: EnergyUnit) => Promise<void>;
  load:      () => Promise<void>;
}

const DEFAULTS: UnitPreferences = { weight: "lbs", energy: "cal" };

export const useUnitsStore = create<UnitsState>((set, get) => ({
  ...DEFAULTS,
  isLoaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.units);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<UnitPreferences>;
        set({
          weight: saved.weight ?? DEFAULTS.weight,
          energy: saved.energy ?? DEFAULTS.energy,
          isLoaded: true,
        });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  setWeight: async (u) => {
    set({ weight: u });
    const { energy } = get();
    await AsyncStorage.setItem(STORAGE_KEYS.units, JSON.stringify({ weight: u, energy }));
  },

  setEnergy: async (u) => {
    set({ energy: u });
    const { weight } = get();
    await AsyncStorage.setItem(STORAGE_KEYS.units, JSON.stringify({ weight, energy: u }));
  },
}));

// Conversion helpers 

export function kgToDisplay(kg: number | null | undefined, unit: WeightUnit): string {
  if (kg == null) return "—";
  if (unit === "lbs") return `${Math.round(kg * 2.2046 * 10) / 10} lbs`;
  return `${kg} kg`;
}

export function cmToDisplay(cm: number | null | undefined): string {
  if (cm == null) return "—";

  return `${cm} cm`;
}

export function kcalToDisplay(kcal: number | null | undefined, unit: EnergyUnit): string {
  if (kcal == null) return "—";
  if (unit === "cal") return `${Math.round(kcal * 1)} cal`;
  return `${kcal} kcal`;
}

export function gramsToDisplay(g: number): string {
  return `${g}g`;
}