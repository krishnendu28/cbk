import { Router } from "express";
import {
  getOrderingStatusHandler,
  updateOrderingStatusHandler,
} from "../controllers/shopController.js";
import { requireAdmin } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validate.js";
import { updateOrderingStatusSchema } from "../schemas/shop-schema.js";

const router = Router();

router.get("/ordering-status", getOrderingStatusHandler);
router.patch(
  "/ordering-status",
  requireAdmin(["owner", "manager"]),
  validateRequest({ bodySchema: updateOrderingStatusSchema }),
  updateOrderingStatusHandler,
);

export default router;
