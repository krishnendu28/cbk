import { randomUUID } from "crypto";
import { Order } from "../models/Order.js";

const memoryOrders = [];
let useMongo = false;

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

  if (useMongo) {
    return Order.create(payload);
  }

  const order = {
    _id: randomUUID(),
    ...payload,
  };

  memoryOrders.unshift(order);
  return order;
}

export async function listOrders() {
  if (useMongo) {
    return Order.find().sort({ createdAt: -1 });
  }
  return memoryOrders;
}

export async function updateOrderStatus(id, status) {
  if (useMongo) {
    return Order.findByIdAndUpdate(id, { status }, { new: true });
  }

  const index = memoryOrders.findIndex((order) => order._id === id);
  if (index < 0) return null;

  memoryOrders[index] = {
    ...memoryOrders[index],
    status,
  };
  return memoryOrders[index];
}

export async function deleteOrder(id) {
  if (useMongo) {
    return Order.findByIdAndDelete(id);
  }

  const index = memoryOrders.findIndex((order) => order._id === id);
  if (index < 0) return null;

  const [deletedOrder] = memoryOrders.splice(index, 1);
  return deletedOrder;
}
