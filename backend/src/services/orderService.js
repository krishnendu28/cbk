import { randomUUID } from "crypto";
import { Order } from "../models/Order.js";
import { findMenuItemById, getAllMenuCategories } from "./menuService.js";
import { decrementInventoryForOrder } from "./inventoryService.js";
import { getOutletSettings } from "./settingsService.js";
import { logger } from "../utils/logger.js";

const DEFAULT_OUTLET_ID = 1;
const memoryOrders = [];
let useMongo = false;

const IS_OFFLINE = process.env.IS_OFFLINE === "true";

function generateOrderCode() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CBK-${timestamp}${random}`;
}

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
  if (!useMongo) {
    if (!IS_OFFLINE) {
      const error = new Error(`Database unavailable. ${operationName} could not be completed.`);
      error.statusCode = 503;
      throw error;
    }
    return memoryOperation();
  }

  try {
    return await mongoOperation();
  } catch (error) {
    logger.warn("database.operation_failed", {
      operation: operationName,
      reason: error?.message || String(error),
    });

    if (IS_OFFLINE) {
      useMongo = false;
      return memoryOperation();
    }

    const wrapped = new Error(`Database write failed for ${operationName}. Please try again.`);
    wrapped.statusCode = 503;
    throw wrapped;
  }
}

export function setMongoEnabled(enabled) {
  useMongo = Boolean(enabled);
}

export function isMongoEnabled() {
  return useMongo;
}

async function countOrdersByPhone(phone) {
  const normalizedPhone = String(phone || "").trim();
  return withMongoFallback(
    "countOrdersByPhone",
    () => Order.countDocuments({ phone: normalizedPhone }),
    () => memoryOrders.filter((order) => String(order.phone || "").trim() === normalizedPhone).length,
  );
}

function applyFirstOrderDiscount(outletSettings, subtotal) {
  if (!outletSettings.firstOrderDiscountEnabled) {
    return null;
  }
  const rate = Math.min(100, Math.max(0, Number(outletSettings.firstOrderDiscountRate) || 0));
  if (rate <= 0) {
    return null;
  }
  return { rate, amount: Math.round((subtotal * rate) / 100) };
}

function promoIsLive(outletSettings) {
  if (!outletSettings.promoActive || Number(outletSettings.promoDiscountRate || 0) <= 0) {
    return false;
  }
  if (outletSettings.promoExpiresAt) {
    return new Date(outletSettings.promoExpiresAt).getTime() > Date.now();
  }
  return true;
}

export async function createOrder({
  customerName,
  phone,
  dateOfBirth,
  address,
  instructions,
  items,
  subtotal,
  discountEnabled,
  discountRate,
  discountAmount,
  total,
  deliveryCharge,
  deliveryEtaMinutes,
  promoCode,
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

  const outletSettings = await getOutletSettings(DEFAULT_OUTLET_ID);
  const computedSubtotal = normalizedItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
  const orderSubtotal = Number(subtotal) >= 0 ? Number(subtotal) : computedSubtotal;

  // Realtime inventory: best-effort decrement, never blocks order placement.
  try {
    decrementInventoryForOrder(normalizedItems);
  } catch (error) {
    logger.warn("inventory.decrement_failed", { reason: error?.message || String(error) });
  }

  const finalDeliveryCharge = deliveryCharge !== undefined && deliveryCharge !== null
    ? Number(deliveryCharge || 0)
    : Number(outletSettings.deliveryCharge || 0);

  const finalEtaMinutes = Number(deliveryEtaMinutes) || Number(outletSettings.etaMinutes) || 45;
  const isFirstOrder = (await countOrdersByPhone(phone)) === 0;
  const normalizedPromoCode = String(promoCode || "").trim();
  const promoCodeActive = String(outletSettings.promoDiscountCode || "").trim();
  const usePromo = promoIsLive(outletSettings) && (!promoCodeActive || normalizedPromoCode === promoCodeActive);

  let finalDiscountEnabled = Boolean(discountEnabled);
  let finalDiscountRate = Number(discountRate) || 0;
  let finalDiscountAmount = Number(discountAmount) || 0;
  let finalPromoCode = normalizedPromoCode;

  if (usePromo) {
    finalDiscountEnabled = true;
    finalDiscountRate = Number(outletSettings.promoDiscountRate || 0);
    finalDiscountAmount = Math.round((orderSubtotal * finalDiscountRate) / 100);
    finalPromoCode = promoCodeActive || normalizedPromoCode;
  } else if (isFirstOrder) {
    const firstOrderDiscount = applyFirstOrderDiscount(outletSettings, orderSubtotal);
    if (firstOrderDiscount) {
      finalDiscountEnabled = true;
      finalDiscountRate = firstOrderDiscount.rate;
      finalDiscountAmount = firstOrderDiscount.amount;
    }
  }

  const finalTotal = Math.max(0, orderSubtotal - finalDiscountAmount + finalDeliveryCharge);

  const payload = {
    customerName,
    orderCode: generateOrderCode(),
    phone,
    dateOfBirth,
    address,
    instructions: String(instructions || "").trim(),
    items: normalizedItems,
    subtotal: orderSubtotal,
    discountEnabled: finalDiscountEnabled,
    discountRate: finalDiscountRate,
    discountAmount: finalDiscountAmount,
    total: finalTotal,
    deliveryCharge: finalDeliveryCharge,
    deliveryEtaMinutes: finalEtaMinutes,
    isFirstOrder,
    promoCode: finalPromoCode,
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
