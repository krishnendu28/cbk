import { Router } from "express";
import {
  addMenuItem,
  editMenuItem,
  listMenu,
  removeMenuItem,
} from "../controllers/menuController.js";
import { requireAdmin } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validate.js";
import {
  createMenuItemSchema,
  menuIdParamSchema,
  updateMenuItemSchema,
} from "../schemas/menu-schema.js";

const router = Router();

router.get("/", listMenu);
router.post("/", requireAdmin(["owner", "manager"]), validateRequest({ bodySchema: createMenuItemSchema }), addMenuItem);
router.patch("/:id", requireAdmin(["owner", "manager"]), validateRequest({ paramsSchema: menuIdParamSchema, bodySchema: updateMenuItemSchema }), editMenuItem);
router.delete("/:id", requireAdmin(["owner"]), validateRequest({ paramsSchema: menuIdParamSchema }), removeMenuItem);

export default router;
