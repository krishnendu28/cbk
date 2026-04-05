import { Router } from "express";
import {
  createOrderHandler,
  deleteOrderHandler,
  listOrdersHandler,
  updateOrderStatusHandler,
} from "../controllers/orderController.js";
import { requireAdmin } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validate.js";
import {
  createOrderSchema,
  orderIdParamSchema,
  updateOrderStatusSchema,
} from "../schemas/order-schema.js";

const router = Router();

router.get("/", listOrdersHandler);
router.post("/", validateRequest({ bodySchema: createOrderSchema }), createOrderHandler);
router.patch("/:id", requireAdmin(["owner", "manager"]), validateRequest({ paramsSchema: orderIdParamSchema, bodySchema: updateOrderStatusSchema }), updateOrderStatusHandler);
router.delete("/:id", requireAdmin(["owner"]), validateRequest({ paramsSchema: orderIdParamSchema }), deleteOrderHandler);

export default router;
