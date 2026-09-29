import { Router } from "express";
import {
  clearMonthlyBroadcastHandler,
  createMonthlySubscriptionHandler,
  deleteMonthlySubscriptionHandler,
  getMonthlyBroadcastHandler,
  getMonthlyPlansHandler,
  getMonthlySubscriptionHandler,
  listMonthlySubscriptionsHandler,
  redeemMonthlyMealHandler,
  setMonthlyBroadcastHandler,
  updateMonthlySubscriptionHandler,
} from "../controllers/monthlyController.js";
import { requireAdmin } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validate.js";
import {
  createMonthlySubscriptionSchema,
  listMonthlySubscriptionsSchema,
  monthlyIdParamSchema,
  redeemMonthlyMealSchema,
  setMonthlyBroadcastSchema,
  updateMonthlySubscriptionSchema,
} from "../schemas/monthly-schema.js";

const router = Router();

router.get("/plans", getMonthlyPlansHandler);
router.get("/broadcast", getMonthlyBroadcastHandler);
router.put(
  "/broadcast",
  requireAdmin(["owner", "manager"]),
  validateRequest({ bodySchema: setMonthlyBroadcastSchema }),
  setMonthlyBroadcastHandler,
);
router.delete("/broadcast", requireAdmin(["owner", "manager"]), clearMonthlyBroadcastHandler);
router.get(
  "/subscriptions",
  (req, res, next) => {
    if (req.query?.phone) return next();
    return requireAdmin(["owner", "manager"])(req, res, next);
  },
  validateRequest({ querySchema: listMonthlySubscriptionsSchema }),
  listMonthlySubscriptionsHandler,
);
router.post("/subscriptions", validateRequest({ bodySchema: createMonthlySubscriptionSchema }), createMonthlySubscriptionHandler);
router.get(
  "/subscriptions/:id",
  requireAdmin(["owner", "manager"]),
  validateRequest({ paramsSchema: monthlyIdParamSchema }),
  getMonthlySubscriptionHandler,
);
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