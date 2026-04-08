import { Router } from "express";
import { requireAdmin } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validate.js";
import { getOutletSettingsHandler, updateOutletSettingsHandler } from "../controllers/settingsController.js";
import { outletIdParamSchema, updateOutletSettingsSchema } from "../schemas/settings-schema.js";

const router = Router();

router.get(
  "/outlets/:outletId/settings",
  validateRequest({ paramsSchema: outletIdParamSchema }),
  getOutletSettingsHandler,
);

router.patch(
  "/outlets/:outletId/settings",
  requireAdmin(["owner", "manager"]),
  validateRequest({ paramsSchema: outletIdParamSchema, bodySchema: updateOutletSettingsSchema }),
  updateOutletSettingsHandler,
);

export default router;
