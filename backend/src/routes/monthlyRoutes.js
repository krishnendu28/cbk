import { Router } from "express";
import {
  createMonthlySubscriptionHandler,
  deleteMonthlySubscriptionHandler,
  getMonthlyPlansHandler,
  getMonthlySubscriptionHandler,
  listMonthlySubscriptionsHandler,
  redeemMonthlyMealHandler,
  updateMonthlySubscriptionHandler,
} from "../controllers/monthlyController.js";
import { requireAdmin } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validate.js";
import {
  createMonthlySubscriptionSchema,
  listMonthlySubscriptionsSchema,
  monthlyIdParamSchema,
  redeemMonthlyMealSchema,
  updateMonthlySubscriptionSchema,
} from "../schemas/monthly-schema.js";

const router = Router();

router.get("/plans", getMonthlyPlansHandler);
router.get("/subscriptions", validateRequest({ querySchema: listMonthlySubscriptionsSchema }), listMonthlySubscriptionsHandler);
router.post("/subscriptions", validateRequest({ bodySchema: createMonthlySubscriptionSchema }), createMonthlySubscriptionHandler);
router.get("/subscriptions/:id", validateRequest({ paramsSchema: monthlyIdParamSchema }), getMonthlySubscriptionHandler);
router.post(
  "/subscriptions/:id/redeem",
  requireAdmin(["owner", "manager"]),
  validateRequest({ paramsSchema: monthlyIdParamSchema, bodySchema: redeemMonthlyMealSchema }),
  redeemMonthlyMealHandler,
);
router.patch(
  "/subscriptions/:id",
  requireAdmin(["owner", "manager"]),
  validateRequest({ paramsSchema: monthlyIdParamSchema, bodySchema: updateMonthlySubscriptionSchema }),
  updateMonthlySubscriptionHandler,
);
router.delete(
  "/subscriptions/:id",
  requireAdmin(["owner", "manager"]),
  validateRequest({ paramsSchema: monthlyIdParamSchema }),
  deleteMonthlySubscriptionHandler,
);

export default router;