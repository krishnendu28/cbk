import { randomUUID } from "crypto";
import { Order } from "../models/Order.js";
import { logger } from "../utils/logger.js";

const memoryOrders = [];
let useMongo = false;

function toMemoryOrder(payload) {
  return {
    _id: randomUUID(),
    ...payload,
  };
}

async function withMongoFallback(operationName, mongoOperation, memoryOperation) {
  if (!useMongo) return memoryOperation();

  try {
    return await mongoOperation();
  } catch (error) {
    useMongo = false;
    logger.warn("database.runtime_fallback_memory", {
      operation: operationName,
      reason: error?.message || String(error),
    });
    return memoryOperation();
  }
}

export function setMongoEnabled(enabled) {
  useMongo = Boolean(enabled);
}

export function isMongoEnabled() {
  return useMongo;
}

export async function createOrder({ customerName, phone, address, items, total, deliveryCharge }) {
  const normalizedItems = items.map((item) => ({
    name: item.name,
    variant: item.variant || "Regular",
    quantity: Number(item.quantity) || 1,
    unitPrice: Number(item.unitPrice) || 0,
    totalPrice: Number(item.totalPrice) || 0,
  }));

  const payload = {
    customerName,
    phone,
    address,
    items: normalizedItems,
    total: Number(total) || 0,
    deliveryCharge: Number(deliveryCharge) || 0,
    status: "Preparing",
    createdAt: new Date(),
  };

  return withMongoFallback(
    "createOrder",
    () => Order.create(payload),
    () => {
      const order = toMemoryOrder(payload);
      memoryOrders.unshift(order);
      return order;
    },
  );
}

export async function listOrders() {
  return withMongoFallback(
    "listOrders",
    () => Order.find().sort({ createdAt: -1 }),
    () => memoryOrders,
  );
}

export async function updateOrderStatus(id, status) {
  return withMongoFallback(
    "updateOrderStatus",
    () => Order.findByIdAndUpdate(id, { status }, { new: true }),
    () => {
      const index = memoryOrders.findIndex((order) => order._id === id);
      if (index < 0) return null;

      memoryOrders[index] = {
        ...memoryOrders[index],
        status,
      };
      return memoryOrders[index];
    },
  );
}

export async function deleteOrder(id) {
  return withMongoFallback(
    "deleteOrder",
    () => Order.findByIdAndDelete(id),
    () => {
      const index = memoryOrders.findIndex((order) => order._id === id);
      if (index < 0) return null;

      const [deletedOrder] = memoryOrders.splice(index, 1);
      return deletedOrder;
    },
  );
}
