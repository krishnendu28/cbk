import { Router } from "express";
import {
  createOrderHandler,
  deleteOrderHandler,
  listOrdersHandler,
  updateOrderStatusHandler,
} from "../controllers/orderController.js";

const router = Router();

router.get("/", listOrdersHandler);
router.post("/", createOrderHandler);
router.patch("/:id", updateOrderStatusHandler);
router.delete("/:id", deleteOrderHandler);

export default router;
