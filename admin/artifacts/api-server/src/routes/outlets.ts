import { Router } from "express";
import { db } from "@workspace/db";
import { outletsTable, outletSettingsTable, ordersTable, customersTable, inventoryTable } from "@workspace/db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  let outlets: (typeof outletsTable.$inferSelect)[] = [];
  if (req.user.role === "owner") {
    outlets = await db.select().from(outletsTable).where(eq(outletsTable.isActive, true));
  } else if (req.user.outletId) {
    outlets = await db.select().from(outletsTable).where(and(eq(outletsTable.id, req.user.outletId), eq(outletsTable.isActive, true)));
  } else {
    outlets = [];
  }

  res.json(outlets.map(o => ({ ...o, createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString() })));
});

router.post("/", async (req, res) => {
  if (!req.user || req.user.role !== "owner") {
    res.status(403).json({ error: "Only owners can create outlets" });
    return;
  }

  const [outlet] = await db.insert(outletsTable).values(req.body).returning();
  await db.insert(outletSettingsTable).values({
    outletId: outlet.id,
    gstEnabled: true, gstRate: "18.00", serviceChargeEnabled: false, serviceChargeRate: "0.00",
    loyaltyPointsPerRupee: "1.00", loyaltyRedemptionRate: "0.10",
    currencySymbol: "₹", receiptFooter: "Thank you!", printKotAutomatically: true,
    zomatoEnabled: false, swiggyEnabled: false, carbonTrackingEnabled: true,
  });
  res.status(201).json({ ...outlet, createdAt: outlet.createdAt.toISOString(), updatedAt: outlet.updatedAt.toISOString() });
});

router.get("/:outletId", async (req, res) => {
  const [outlet] = await db.select().from(outletsTable).where(eq(outletsTable.id, parseInt(req.params.outletId))).limit(1);
  if (!outlet) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...outlet, createdAt: outlet.createdAt.toISOString(), updatedAt: outlet.updatedAt.toISOString() });
});

router.put("/:outletId", async (req, res) => {
  if (!req.user || (req.user.role !== "owner" && req.user.role !== "manager")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [outlet] = await db.update(outletsTable).set({ ...req.body, updatedAt: new Date() })
    .where(eq(outletsTable.id, parseInt(req.params.outletId))).returning();
  res.json({ ...outlet, createdAt: outlet.createdAt.toISOString(), updatedAt: outlet.updatedAt.toISOString() });
});

// Dashboard
router.get("/:outletId/dashboard", async (req, res) => {
  const outletId = parseInt(req.params.outletId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayOrders = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.outletId, outletId), gte(ordersTable.createdAt, today), lte(ordersTable.createdAt, tomorrow)));

  const paidOrders = todayOrders.filter(o => o.status !== "cancelled");
  const todaySales = paidOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);
  const activeOrders = todayOrders.filter(o => ["pending", "confirmed", "preparing", "ready"].includes(o.status)).length;
  const avgOrderValue = paidOrders.length > 0 ? todaySales / paidOrders.length : 0;

  // Hourly sales
  const salesByHour = Array.from({ length: 24 }, (_, h) => {
    const hourOrders = paidOrders.filter(o => new Date(o.createdAt).getHours() === h);
    return { hour: h, sales: hourOrders.reduce((s, o) => s + parseFloat(o.totalAmount), 0), orders: hourOrders.length };
  });

  // Top items from today
  const itemMap = new Map<number, { name: string; quantity: number; revenue: number }>();
  for (const order of paidOrders) {
    const items = order.items as any[];
    for (const item of items) {
      const existing = itemMap.get(item.menuItemId) || { name: item.menuItemName, quantity: 0, revenue: 0 };
      itemMap.set(item.menuItemId, { name: item.menuItemName, quantity: existing.quantity + item.quantity, revenue: existing.revenue + item.totalPrice });
    }
  }
  const topItems = Array.from(itemMap.entries())
    .map(([id, v]) => ({ itemId: id, ...v }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Week sales (last 7 days)
  const weekSales = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const nextD = new Date(d);
    nextD.setDate(nextD.getDate() + 1);
    const dayOrders = await db.select().from(ordersTable)
      .where(and(eq(ordersTable.outletId, outletId), gte(ordersTable.createdAt, d), lte(ordersTable.createdAt, nextD)));
    const dayPaid = dayOrders.filter(o => o.status !== "cancelled");
    weekSales.push({
      date: d.toISOString().split("T")[0],
      sales: dayPaid.reduce((s, o) => s + parseFloat(o.totalAmount), 0),
      orders: dayPaid.length,
    });
  }

  // Payment breakdown
  const payMap = new Map<string, { amount: number; count: number }>();
  for (const order of paidOrders.filter(o => o.paymentMethod)) {
    const m = order.paymentMethod!;
    const ex = payMap.get(m) || { amount: 0, count: 0 };
    payMap.set(m, { amount: ex.amount + parseFloat(order.totalAmount), count: ex.count + 1 });
  }
  const paymentBreakdown = Array.from(payMap.entries()).map(([method, v]) => ({ method, ...v }));

  const [customersCount] = await db.select({ count: sql<number>`count(*)` }).from(customersTable).where(eq(customersTable.outletId, outletId));
  const lowStockItems = await db.select().from(inventoryTable).where(eq(inventoryTable.outletId, outletId));
  const lowStock = lowStockItems.filter(i => parseFloat(i.currentStock) <= parseFloat(i.minStock)).length;

  const recentOrders = await db.select().from(ordersTable)
    .where(eq(ordersTable.outletId, outletId))
    .orderBy(desc(ordersTable.createdAt)).limit(8);

  res.json({
    todaySales, todayOrders: paidOrders.length, activeOrders, avgOrderValue,
    totalCustomers: Number(customersCount.count),
    lowStockItems: lowStock,
    salesByHour, topItems, weekSales, paymentBreakdown,
    recentOrders: recentOrders.map(o => ({
      ...o,
      subtotal: parseFloat(o.subtotal), discountAmount: parseFloat(o.discountAmount),
      taxAmount: parseFloat(o.taxAmount), totalAmount: parseFloat(o.totalAmount),
      discountValue: o.discountValue ? parseFloat(o.discountValue) : null,
      createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString(),
    })),
  });
});

// Settings
router.get("/:outletId/settings", async (req, res) => {
  const outletId = parseInt(req.params.outletId);
  const [settings] = await db.select().from(outletSettingsTable).where(eq(outletSettingsTable.outletId, outletId)).limit(1);
  if (!settings) { res.status(404).json({ error: "Settings not found" }); return; }
  res.json({
    ...settings,
    gstRate: parseFloat(settings.gstRate), serviceChargeRate: parseFloat(settings.serviceChargeRate),
    loyaltyPointsPerRupee: parseFloat(settings.loyaltyPointsPerRupee),
    loyaltyRedemptionRate: parseFloat(settings.loyaltyRedemptionRate),
  });
});

router.put("/:outletId/settings", async (req, res) => {
  const outletId = parseInt(req.params.outletId);
  const body = req.body;
  const [settings] = await db.update(outletSettingsTable)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(outletSettingsTable.outletId, outletId)).returning();
  res.json({
    ...settings,
    gstRate: parseFloat(settings.gstRate), serviceChargeRate: parseFloat(settings.serviceChargeRate),
    loyaltyPointsPerRupee: parseFloat(settings.loyaltyPointsPerRupee),
    loyaltyRedemptionRate: parseFloat(settings.loyaltyRedemptionRate),
  });
});

export default router;
