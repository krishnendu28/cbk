import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

const router = Router({ mergeParams: true });

router.get("/sales", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const { from, to, groupBy = "day" } = req.query;
  const fromDate = from ? new Date(from as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to as string) : new Date();
  toDate.setHours(23, 59, 59, 999);

  const orders = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.outletId, outletId), gte(ordersTable.createdAt, fromDate), lte(ordersTable.createdAt, toDate)));
  const paid = orders.filter(o => o.status !== "cancelled");

  // Group by day
  const dayMap = new Map<string, { sales: number; orders: number }>();
  for (const o of paid) {
    const key = o.createdAt.toISOString().split("T")[0];
    const ex = dayMap.get(key) || { sales: 0, orders: 0 };
    dayMap.set(key, { sales: ex.sales + parseFloat(o.totalAmount), orders: ex.orders + 1 });
  }

  // Fill in missing days
  const data = [];
  const d = new Date(fromDate);
  while (d <= toDate) {
    const key = d.toISOString().split("T")[0];
    const val = dayMap.get(key) || { sales: 0, orders: 0 };
    data.push({ date: key, ...val });
    d.setDate(d.getDate() + 1);
  }

  const totalSales = paid.reduce((s, o) => s + parseFloat(o.totalAmount), 0);
  const totalOrders = paid.length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  // Comparison with previous period
  const periodLen = toDate.getTime() - fromDate.getTime();
  const prevFrom = new Date(fromDate.getTime() - periodLen);
  const prevTo = new Date(fromDate);
  const prevOrders = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.outletId, outletId), gte(ordersTable.createdAt, prevFrom), lte(ordersTable.createdAt, prevTo)));
  const prevPaid = prevOrders.filter(o => o.status !== "cancelled");
  const prevSales = prevPaid.reduce((s, o) => s + parseFloat(o.totalAmount), 0);
  const salesChange = prevSales > 0 ? ((totalSales - prevSales) / prevSales) * 100 : 0;
  const ordersChange = prevPaid.length > 0 ? ((totalOrders - prevPaid.length) / prevPaid.length) * 100 : 0;

  res.json({ totalSales, totalOrders, avgOrderValue, data, comparison: { salesChange, ordersChange } });
});

router.get("/items", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const { from, to } = req.query;
  const fromDate = from ? new Date(from as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to as string) : new Date();
  toDate.setHours(23, 59, 59, 999);

  const orders = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.outletId, outletId), gte(ordersTable.createdAt, fromDate), lte(ordersTable.createdAt, toDate)));

  const itemMap = new Map<number, { name: string; category: string; quantity: number; revenue: number }>();
  for (const order of orders.filter(o => o.status !== "cancelled")) {
    for (const item of (order.items as any[])) {
      const ex = itemMap.get(item.menuItemId) || { name: item.menuItemName, category: "", quantity: 0, revenue: 0 };
      itemMap.set(item.menuItemId, { name: item.menuItemName, category: ex.category, quantity: ex.quantity + item.quantity, revenue: ex.revenue + item.totalPrice });
    }
  }

  res.json(Array.from(itemMap.entries()).map(([id, v]) => ({
    itemId: id, name: v.name, category: v.category || "Menu",
    quantitySold: v.quantity, revenue: v.revenue, avgPrice: v.quantity > 0 ? v.revenue / v.quantity : 0,
  })).sort((a, b) => b.revenue - a.revenue));
});

router.get("/payments", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const { from, to } = req.query;
  const fromDate = from ? new Date(from as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to as string) : new Date();
  toDate.setHours(23, 59, 59, 999);

  const orders = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.outletId, outletId), gte(ordersTable.createdAt, fromDate), lte(ordersTable.createdAt, toDate)));

  const payMap = new Map<string, { amount: number; count: number }>();
  for (const o of orders.filter(o => o.status === "paid" && o.paymentMethod)) {
    const ex = payMap.get(o.paymentMethod!) || { amount: 0, count: 0 };
    payMap.set(o.paymentMethod!, { amount: ex.amount + parseFloat(o.totalAmount), count: ex.count + 1 });
  }
  const breakdown = Array.from(payMap.entries()).map(([method, v]) => ({ method, ...v }));
  const total = breakdown.reduce((s, b) => s + b.amount, 0);
  res.json({ total, breakdown });
});

// AI Demand Forecast (mock with realistic patterns)
router.get("/forecast", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const today = new Date();

  // Get last 14 days of data for pattern
  const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
  const orders = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.outletId, outletId), gte(ordersTable.createdAt, twoWeeksAgo)));

  const avgDaily = orders.length > 0 ? orders.reduce((s, o) => s + parseFloat(o.totalAmount), 0) / 14 : 8000;
  const avgOrders = orders.length > 0 ? orders.length / 14 : 35;

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const multipliers = [0.7, 0.85, 0.9, 0.95, 1.0, 1.3, 1.25]; // weekend higher

  const forecast = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i + 1);
    const mult = multipliers[d.getDay()];
    const variance = 0.85 + Math.random() * 0.3;
    return {
      date: d.toISOString().split("T")[0],
      predictedSales: Math.round(avgDaily * mult * variance),
      predictedOrders: Math.round(avgOrders * mult * variance),
      confidence: Math.round(75 + Math.random() * 20),
    };
  });

  const topPredictedItems = [
    { name: "Butter Chicken", predictedQuantity: Math.round(15 + Math.random() * 10) },
    { name: "Chicken Biryani", predictedQuantity: Math.round(12 + Math.random() * 8) },
    { name: "Paneer Tikka", predictedQuantity: Math.round(10 + Math.random() * 8) },
    { name: "Dal Makhani", predictedQuantity: Math.round(8 + Math.random() * 6) },
    { name: "Garlic Naan", predictedQuantity: Math.round(25 + Math.random() * 15) },
  ];

  const insights = [
    "Weekend sales expected to be 30% higher than weekdays",
    "Stock up on Chicken and Paneer before Friday",
    "Peak ordering time: 7-9 PM",
    "Beverages demand increases by 45% on warm days",
    "Recommend activating Swiggy Happy Hours promotion on Tuesday",
  ];

  res.json({ forecast, topPredictedItems, insights });
});

export default router;
