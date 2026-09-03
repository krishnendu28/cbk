import { Router } from "express";
import {
  addInventoryItem,
  editInventoryItem,
  listInventory,
  removeInventoryItem,
} from "../controllers/inventoryController.js";
import { requireAdmin } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validate.js";
import {
  createInventoryItemSchema,
  inventoryIdParamSchema,
  updateInventoryItemSchema,
} from "../schemas/inventory-schema.js";

const router = Router();

router.get("/", listInventory);
router.post("/", requireAdmin(["owner", "manager"]), validateRequest({ bodySchema: createInventoryItemSchema }), addInventoryItem);
router.patch("/:id", requireAdmin(["owner", "manager"]), validateRequest({ paramsSchema: inventoryIdParamSchema, bodySchema: updateInventoryItemSchema }), editInventoryItem);
router.delete("/:id", requireAdmin(["owner", "manager"]), validateRequest({ paramsSchema: inventoryIdParamSchema }), removeInventoryItem);

export default router;
