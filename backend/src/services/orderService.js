import { randomUUID } from "crypto";
import { Order } from "../models/Order.js";
import { findMenuItemById, getAllMenuCategories } from "./menuService.js";
import { logger } from "../utils/logger.js";

const memoryOrders = [];
let useMongo = false;

function toMemoryOrder(payload) {
  return {
    _id: randomUUID(),
    ...payload,
  };
}

function findMenuItemByName(name) {
  const normalizedName = String(name || "").trim().toLowerCase();
  if (!normalizedName) return null;

  for (const category of getAllMenuCategories()) {
    const item = category.items.find((entry) => String(entry.name || "").trim().toLowerCase() === normalizedName);
    if (item) {
      return { category, item };
    }
  }

  return null;
}

function validateOrderItems(items) {
  const unavailableItems = [];

  for (const item of items) {
    const byId = item.menuItemId !== undefined && item.menuItemId !== null ? findMenuItemById(Number(item.menuItemId)) : null;
    const source = byId || findMenuItemByName(item.name);

    if (source && source.item.available === false) {
      unavailableItems.push(source.item.name || item.name);
    }
  }

  if (unavailableItems.length > 0) {
    const error = new Error(`Menu item ${unavailableItems[0]} is currently unavailable.`);
    error.statusCode = 400;
    throw error;
  }
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

export async function createOrder({
  customerName,
  phone,
  dateOfBirth,
  address,
  items,
  subtotal,
  discountEnabled,
  discountRate,
  discountAmount,
  total,
  deliveryCharge,
}) {
  validateOrderItems(items);

  const normalizedItems = items.map((item) => ({
    menuItemId: item.menuItemId !== undefined ? Number(item.menuItemId) : undefined,
    name: item.name,
    variant: item.variant || "Regular",
    quantity: Number(item.quantity) || 1,
    unitPrice: Number(item.unitPrice) || 0,
    totalPrice: Number(item.totalPrice) || 0,
  }));

  const payload = {
    customerName,
    phone,
    dateOfBirth,
    address,
    items: normalizedItems,
    subtotal: Number(subtotal) || normalizedItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0),
    discountEnabled: Boolean(discountEnabled),
    discountRate: Number(discountRate) || 0,
    discountAmount: Number(discountAmount) || 0,
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
