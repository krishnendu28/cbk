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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function lastTenDigits(value) {
  return digitsOnly(value).slice(-10);
}

function resolveMenuItemSource(item) {
  const byId =
    item.menuItemId !== undefined && item.menuItemId !== null ? findMenuItemById(Number(item.menuItemId)) : null;
  return byId || findMenuItemByName(item.name);
}

function serverPriceFor(item, source) {
  const prices = source?.item?.prices || {};
  const variant = item.variant || "Regular";
  const keys = Object.keys(prices);
  if (prices[variant] !== undefined) return Math.max(0, Number(prices[variant]) || 0);
  if (prices.Regular !== undefined) return Math.max(0, Number(prices.Regular) || 0);
  if (keys.length > 0) return Math.max(0, Number(prices[keys[0]]) || 0);
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
  discountEnabled,
  discountRate,
  discountAmount,
  deliveryCharge,
  deliveryEtaMinutes,
  promoCode,
}) {
  validateOrderItems(items);

  const normalizedItems = items.map((item) => {
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const source = resolveMenuItemSource(item);
    const serverUnitPrice = source ? serverPriceFor(item, source) : null;

    let unitPrice;
    let totalPrice;
    if (serverUnitPrice !== null) {
      unitPrice = serverUnitPrice;
      totalPrice = serverUnitPrice * quantity;
    } else {
      unitPrice = Math.max(0, Number(item.unitPrice) || 0);
      totalPrice = Math.max(0, Number(item.totalPrice) || 0);
    }

    return {
      menuItemId: item.menuItemId !== undefined ? Number(item.menuItemId) : undefined,
      name: item.name,
      variant: item.variant || "Regular",
      quantity,
      unitPrice,
      totalPrice,
    };
  });

  const outletSettings = await getOutletSettings(DEFAULT_OUTLET_ID);
  const computedSubtotal = normalizedItems.reduce((sum, item) => sum + Math.round(item.totalPrice), 0);
  const orderSubtotal = Math.max(0, computedSubtotal);

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
  let finalPromoCode = "";

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

  finalDiscountAmount = Math.min(finalDiscountAmount, orderSubtotal);
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

  const order = await withMongoFallback(
    "createOrder",
    () => Order.create(payload),
    () => {
      const order = toMemoryOrder(payload);
      memoryOrders.unshift(order);
      return order;
    },
  );

  // Monthly plans: auto-null away one meal whenever an active subscriber places
  // an order, so the admin sees the plan being used (redemption log + calendar).
  // Best-effort and never blocks order placement.
  try {
    await autoRedeemMonthlyMealForOrder(order);
  } catch (error) {
    logger.warn("monthly.auto_redeem_failed", { reason: error?.message || String(error), orderCode: order?.orderCode });
  }

  return order;
}

function mealTypeForTime(date = new Date()) {
  const hour = date.getHours();
  return hour < 15 ? "Lunch" : "Dinner";
}

const MEAL_ELIGIBLE_KEYWORDS = [
  "thali",
  "combo",
  "biryani",
  "meal",
  "tadka",
  "curry",
  "handi",
  "roti",
  "naan",
  "paratha",
];

function orderQualifiesForMonthlyRedeem(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (items.length === 0) return false;
  const haystack = items.map((item) => String(item?.name || "").toLowerCase()).join(" ");
  return MEAL_ELIGIBLE_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

async function autoRedeemMonthlyMealForOrder(order) {
  if (!order || !order.phone || !orderQualifiesForMonthlyRedeem(order)) return;

  const { listSubscriptions, redeemMeals } = await import("./monthlyService.js");
  const subscriptions = await listSubscriptions({ phone: String(order.phone).trim(), status: "Active" });
  const subscription = Array.isArray(subscriptions)
    ? subscriptions.find((row) => Number(row.mealsRemaining) > 0)
    : null;
  if (!subscription) return;

  await redeemMeals(subscription._id, {
    count: 1,
    meal: mealTypeForTime(),
    note: `Auto-redeemed on order ${order.orderCode}`,
    redeemedBy: "order",
  });
  logger.info("monthly.auto_redeem_success", {
    subscriptionId: subscription._id,
    orderCode: order.orderCode,
    remaining: subscription.mealsRemaining - 1,
  });
}

export async function listOrders({ phone } = {}) {
  const suffix = lastTenDigits(phone);
  const filter = {};
  if (suffix) {
    filter.phone = new RegExp(`${escapeRegExp(suffix)}$`);
  }

  return withMongoFallback(
    "listOrders",
    () => Order.find(filter).sort({ createdAt: -1 }),
    () => {
      let rows = memoryOrders;
      if (suffix) {
        rows = rows.filter((order) => lastTenDigits(order.phone) === suffix);
      }
      return rows;
    },
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
