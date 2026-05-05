import axios from "axios";
import { Response } from "express";
import { config } from "@/config";
import { AuthRequest } from "@/middleware/auth.middleware";

// USDA FoodData Central API
// Docs: https://api.nal.usda.gov/fdc/v1
// Free API key: https://fdc.nal.usda.gov/api-guide.html
// No monthly limits. Branded foods include full nutrient panels + GTINs (barcodes).

const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";

// Nutrient IDs used by USDA FoodData Central
const NUTRIENT_IDS = {
  CALORIES:  1008,  // Energy (kcal)
  PROTEIN:   1003,  // Protein (g)
  CARBS:     1005,  // Carbohydrate, by difference (g)
  FAT:       1004,  // Total lipid (fat) (g)
  FIBER:     1079,  // Fiber, total dietary (g)
  SODIUM:    1093,  // Sodium (mg)
} as const;

// USDA data types to search. "Branded" covers packaged foods with barcodes.
// "Foundation" and "SR Legacy" cover whole/raw ingredients.
const DATA_TYPES = ["Branded", "Foundation", "SR Legacy"].join(",");

interface NutrientValue {
  nutrientId: number;
  value: number;
}

function getNutrient(nutrients: NutrientValue[], id: number): number {
  return nutrients.find((n) => n.nutrientId === id)?.value ?? 0;
}

/**
 * Normalise a USDA food item (from either search results or detail endpoint)
 * into our shared FoodItem shape.
 *
 * USDA reports nutrients per 100g by default. Branded foods also carry
 * a servingSize + servingSizeUnit from the package label — we use those
 * when available so the displayed serving is meaningful.
 */
function toFoodItem(food: any) {
  const nutrients: NutrientValue[] = (
    food.foodNutrients ?? food.nutrients ?? []
  ).map((n: any) => ({
    nutrientId: n.nutrientId ?? n.nutrient?.id,
    value:      n.value      ?? n.amount ?? 0,
  }));

  // Serving size: prefer branded label values, fall back to 100g
  const servingSize = food.servingSize ?? 100;
  const servingUnit = food.servingSizeUnit ?? "g";

  // Nutrients are per 100g — scale to the serving size
  const scale = servingSize / 100;

  return {
    id:          String(food.fdcId),
    usdaFdcId:   food.fdcId,
    name:        food.description ?? food.lowercaseDescription ?? "Unknown",
    brand:       food.brandOwner ?? food.brandName ?? null,
    calories:    Math.round(getNutrient(nutrients, NUTRIENT_IDS.CALORIES)  * scale),
    proteinG:    Math.round(getNutrient(nutrients, NUTRIENT_IDS.PROTEIN)   * scale * 10) / 10,
    carbsG:      Math.round(getNutrient(nutrients, NUTRIENT_IDS.CARBS)     * scale * 10) / 10,
    fatG:        Math.round(getNutrient(nutrients, NUTRIENT_IDS.FAT)       * scale * 10) / 10,
    fiberG:      Math.round(getNutrient(nutrients, NUTRIENT_IDS.FIBER)     * scale * 10) / 10,
    sodiumMg:    Math.round(getNutrient(nutrients, NUTRIENT_IDS.SODIUM)    * scale),
    servingSize,
    servingUnit,
    imageUrl:    null,  
    usdaDataType: food.dataType ?? null,
  };
}


async function searchByQuery(q: string) {
  const { data } = await axios.get(`${USDA_BASE}/foods/search`, {
    params: {
      api_key:   config.usda.apiKey,
      query:     q,
      dataType:  DATA_TYPES,
      pageSize:  25,
      pageNumber: 1,
      sortBy:    "dataType.keyword",
      sortOrder: "asc",
    },
  });

  return (data.foods ?? []).map(toFoodItem);
}


async function searchByBarcode(upc: string) {
  const stripped = upc.replace(/^0+/, "").slice(-12);

  const { data } = await axios.get(`${USDA_BASE}/foods/search`, {
    params: {
      api_key:   config.usda.apiKey,
      query:     stripped,
      dataType:  "Branded",
      pageSize:  5,
    },
  });

  const exact = (data.foods ?? []).filter(
    (f: any) =>
      f.gtinUpc === stripped ||
      f.gtinUpc === upc ||
      f.gtinUpc === upc.padStart(14, "0")
  );

  const results = exact.length > 0 ? exact : (data.foods ?? []).slice(0, 3);
  return results.map(toFoodItem);
}


export async function searchFood(req: AuthRequest, res: Response): Promise<void> {
  const { q, upc } = req.query;

  if (!q && !upc) {
    res.status(400).json({ message: "Provide q (search query) or upc (barcode)" });
    return;
  }

  try {
    const foods = upc
      ? await searchByBarcode(upc as string)
      : await searchByQuery(q as string);

    res.json({ foods });
  } catch (err: any) {
    const status  = err?.response?.status;
    const message = err?.response?.data?.message ?? err.message;

    if (status === 403) {
      console.error("[USDA] Invalid or missing API key");
      res.status(502).json({ message: "Nutrition service configuration error" });
    } else if (status === 429) {
      console.error("[USDA] Rate limit hit");
      res.status(429).json({ message: "Too many requests — please try again shortly" });
    } else {
      console.error("[USDA] Search error:", message);
      res.status(502).json({ message: "Failed to fetch nutrition data" });
    }
  }
}