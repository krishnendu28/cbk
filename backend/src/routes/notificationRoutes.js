import { Router } from "express";
import {
  broadcastNotificationHandler,
  getPushNotificationHealthHandler,
  registerDeviceTokenHandler,
} from "../controllers/notificationController.js";
import { requireAdmin } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validate.js";
import { broadcastNotificationSchema, registerDeviceTokenSchema } from "../schemas/notification-schema.js";

const router = Router();

router.post(
  "/device-token",
  validateRequest({ bodySchema: registerDeviceTokenSchema }),
  registerDeviceTokenHandler,
);

router.get(
  "/health",
  requireAdmin(["owner", "manager"]),
  getPushNotificationHealthHandler,
);

router.post(
  "/broadcast",
  requireAdmin(["owner", "manager"]),
  validateRequest({ bodySchema: broadcastNotificationSchema }),
  broadcastNotificationHandler,
);

export default router;
