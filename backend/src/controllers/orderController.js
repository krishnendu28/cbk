import { getIO } from "../config/socket.js";
import {
  createOrder,
  deleteOrder,
  listOrders,
  updateOrderStatus,
} from "../services/orderService.js";
import { getOrderingStatus } from "../services/shopService.js";

export async function createOrderHandler(req, res) {
  try {
    const orderingStatus = await getOrderingStatus();
    if (!orderingStatus.isOrderingOpen) {
      return res.status(403).json({
        message: "Ordering is currently closed. Please try again during opening hours.",
      });
    }

    const order = await createOrder(req.body);
    getIO().emit("new_order", order);
    return res.status(201).json(order);
  } catch (error) {
    console.error(error);
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to place order." });
  }
}

export async function listOrdersHandler(req, res) {
  try {
    const orders = await listOrders();
    return res.json(orders);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch orders." });
  }
}

export async function updateOrderStatusHandler(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedOrder = await updateOrderStatus(id, status);
    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found." });
    }

    getIO().emit("order_updated", updatedOrder);
    return res.json(updatedOrder);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update order status." });
  }
}

export async function deleteOrderHandler(req, res) {
  try {
    const { id } = req.params;
    const deletedOrder = await deleteOrder(id);
    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found." });
    }

    getIO().emit("order_deleted", { _id: id });
    return res.json({ ok: true, _id: id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to delete order." });
  }
}
