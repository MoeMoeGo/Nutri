import { Router } from "express";
import { body, param } from "express-validator";
import { authenticate } from "@/middleware/auth.middleware";
import * as authCtrl     from "@/controllers/auth.controller";
import * as foodCtrl     from "@/controllers/food.controller";
import * as weightCtrl   from "@/controllers/weight.controller";
import * as pushCtrl     from "@/controllers/push.controller";
import * as progressCtrl from "@/controllers/progress.controller";
import * as syncCtrl     from "@/controllers/sync.controller";
import { searchFood }    from "@/services/nutrition.service";
import { validateRequest } from "@/middleware/validate.middleware";

const router = Router();

router.post("/auth/register",  [body("email").isEmail().normalizeEmail(),body("password").isLength({min:8}),body("name").trim().isLength({min:2}),validateRequest], authCtrl.register);
router.post("/auth/login",     [body("email").isEmail().normalizeEmail(),body("password").notEmpty(),validateRequest], authCtrl.login);
router.post("/auth/google",    [body("idToken").notEmpty(),validateRequest], authCtrl.googleAuth);
router.post("/auth/apple",     [body("identityToken").notEmpty(),validateRequest], authCtrl.appleAuth);
router.post("/auth/refresh",   [body("refreshToken").notEmpty(),validateRequest], authCtrl.refresh);

router.get("/user/profile", authenticate, authCtrl.getProfile);
router.put("/user/profile",  authenticate, [
  body("age").optional().isInt({min:13,max:120}),
  body("weightKg").optional().isFloat({min:20}),
  body("heightCm").optional().isFloat({min:50}),
  body("goal").optional().isIn(["lose","maintain","gain"]),
  body("activityLevel").optional().isIn(["sedentary","light","moderate","active","very_active"]),
  body("dailyCalorieGoal").optional().isInt({min:800}),
  body("onboardingCompleted").optional().isBoolean(),
  body("notifyBreakfast").optional().isBoolean(),
  body("notifyLunch").optional().isBoolean(),
  body("notifyDinner").optional().isBoolean(),
  body("notifySummary").optional().isBoolean(),
  validateRequest,
], authCtrl.updateProfile);

router.post("/food/log", authenticate, [
  body("foodName").trim().notEmpty(), body("calories").isFloat({min:0}),
  body("proteinG").isFloat({min:0}),  body("carbsG").isFloat({min:0}),
  body("fatG").isFloat({min:0}),      body("servingSize").isFloat({min:0}),
  body("servingUnit").notEmpty(),      body("mealType").isIn(["breakfast","lunch","dinner","snack"]),
  validateRequest,
], foodCtrl.logFood);
router.get("/food/daily-summary", authenticate, foodCtrl.getDailySummary);
router.get("/food/logs",          authenticate, foodCtrl.getFoodLogs);
router.get("/food/recent",        authenticate, progressCtrl.getRecentFoods);
router.put("/food/log/:id", authenticate, [param("id").notEmpty(),body("mealType").optional().isIn(["breakfast","lunch","dinner","snack"]),body("servingMultiplier").optional().isFloat({min:0.1}),validateRequest], foodCtrl.updateFoodLog);
router.delete("/food/log/:id", authenticate, foodCtrl.deleteFoodLog);
router.post("/food/sync", authenticate, [body("entries").isArray({min:1,max:500}),validateRequest], syncCtrl.batchSync);

router.get("/nutrition/search", authenticate, searchFood);

router.post("/weight", authenticate, [body("weightKg").isFloat({min:20,max:500}),validateRequest], weightCtrl.logWeight);
router.get("/weight",  authenticate, weightCtrl.getWeightHistory);

router.get("/progress/weekly",  authenticate, progressCtrl.getWeeklyProgress);
router.get("/progress/monthly", authenticate, progressCtrl.getMonthlyProgress);

router.post("/push/register", authenticate, [body("token").notEmpty(),body("platform").isIn(["ios","android","web"]),validateRequest], pushCtrl.registerPushToken);
router.post("/push/test",     authenticate, pushCtrl.testPush);

export default router;
