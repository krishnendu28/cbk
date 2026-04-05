import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, menuItemsTable, tablesTable, kotsTable, billsTable, outletSettingsTable, customersTable, outletsTable } from "@workspace/db/schema";
import { eq, and, gte, lte, like, desc, sql } from "drizzle-orm";

const router = Router({ mergeParams: true });

let orderCounter = 1000;
let kotCounter = 100;
let billCounter = 5000;

function orderNum(outletId: number) { return `ORD-${outletId}-${++orderCounter}`; }
function kotNum() { return `KOT-${++kotCounter}`; }
function billNum() { return `BILL-${++billCounter}`; }

function fmtOrder(o: any) {
  return {
    ...o,
    subtotal: parseFloat(o.subtotal), discountAmount: parseFloat(o.discountAmount),
    taxAmount: parseFloat(o.taxAmount), totalAmount: parseFloat(o.totalAmount),
    discountValue: o.discountValue ? parseFloat(o.discountValue) : null,
    items: (o.items as any[]) || [],
    createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString(),
    tableName: null, staffName: null, customerName: o.customerName, customerPhone: o.customerPhone,
  };
}

// Calculate order totals
async function calcTotals(items: any[], outletId: number, discountType?: string, discountValue?: number) {
  const [settings] = await db.select().from(outletSettingsTable).where(eq(outletSettingsTable.outletId, outletId)).limit(1);
  const gstRate = settings ? parseFloat(settings.gstRate) : 5;

  let subtotal = 0;
  const enrichedItems: any[] = [];
  let idCounter = Date.now();

  for (const item of items) {
    const [menuItem] = await db.select().from(menuItemsTable).where(eq(menuItemsTable.id, item.menuItemId)).limit(1);
    if (!menuItem) continue;
    const variants = (menuItem.variants as any[]) || [];
    const addons = (menuItem.addons as any[]) || [];
    let unitPrice = parseFloat(menuItem.basePrice);
    let variantName = null;
    if (item.variantId) {
      const variant = variants.find((v: any) => v.id === item.variantId);
      if (variant) { unitPrice = variant.price; variantName = variant.name; }
    }
    const selectedAddons = addons.filter((a: any) => (item.addonIds || []).includes(a.id));
    const addonTotal = selectedAddons.reduce((s: number, a: any) => s + a.price, 0);
    const totalPrice = (unitPrice + addonTotal) * item.quantity;
    subtotal += totalPrice;
    enrichedItems.push({
      id: idCounter++, menuItemId: item.menuItemId, menuItemName: menuItem.name,
      quantity: item.quantity, unitPrice, variantId: item.variantId || null, variantName,
      addonIds: item.addonIds || [], addonNames: selectedAddons.map((a: any) => a.name),
      addonTotal: addonTotal * item.quantity, totalPrice, notes: item.notes || null, kotStatus: "pending",
    });
  }

  let discountAmount = 0;
  if (discountType && discountValue) {
    if (discountType === "percent") discountAmount = (subtotal * discountValue) / 100;
    else discountAmount = discountValue;
  }
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * gstRate) / 100;
  const totalAmount = taxableAmount + taxAmount;

  return { enrichedItems, subtotal, discountAmount, taxAmount, totalAmount };
}

router.get("/", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const { status, type, date, limit = "50", offset = "0" } = req.query;

  let orders = await db.select().from(ordersTable).where(eq(ordersTable.outletId, outletId))
    .orderBy(desc(ordersTable.createdAt))
    .limit(parseInt(limit as string)).offset(parseInt(offset as string));

  if (status) orders = orders.filter(o => o.status === status);
  if (type) orders = orders.filter(o => o.type === type);
  if (date) {
    const d = new Date(date as string);
    orders = orders.filter(o => o.createdAt.toDateString() === d.toDateString());
  }

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(ordersTable).where(eq(ordersTable.outletId, outletId));

  // Enrich with table names
  const tables = await db.select().from(tablesTable).where(eq(tablesTable.outletId, outletId));
  const tableMap = new Map(tables.map(t => [t.id, t.name]));

  res.json({
    orders: orders.map(o => ({ ...fmtOrder(o), tableName: o.tableId ? tableMap.get(o.tableId) || null : null })),
    total: Number(count),
    limit: parseInt(limit as string),
    offset: parseInt(offset as string),
  });
});

router.post("/", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const { type, tableId, customerId, customerName, customerPhone, items, notes, staffId } = req.body;

  const { enrichedItems, subtotal, discountAmount, taxAmount, totalAmount } = await calcTotals(items, outletId);

  const [order] = await db.insert(ordersTable).values({
    outletId, orderNumber: orderNum(outletId), type, status: "confirmed",
    tableId: tableId || null, customerId: customerId || null,
    customerName: customerName || null, customerPhone: customerPhone || null,
    items: enrichedItems,
    subtotal: String(subtotal), discountAmount: "0.00", taxAmount: String(taxAmount), totalAmount: String(totalAmount),
    paymentStatus: "pending", notes: notes || null, staffId: staffId || null,
  }).returning();

  // Update table status if dine-in
  if (type === "dine-in" && tableId) {
    await db.update(tablesTable).set({ status: "occupied", currentOrderId: order.id }).where(eq(tablesTable.id, tableId));
  }

  // Auto-create KOT
  const settings = await db.select().from(outletSettingsTable).where(eq(outletSettingsTable.outletId, outletId)).limit(1);
  if (!settings[0] || settings[0].printKotAutomatically) {
    await db.insert(kotsTable).values({
      outletId, orderId: order.id, kotNumber: kotNum(), station: "kitchen",
      status: "pending", items: enrichedItems,
    });
  }

  res.status(201).json(fmtOrder(order));
});

router.get("/:orderId", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const orderId = parseInt(req.params.orderId);
  const [order] = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.outletId, outletId))).limit(1);
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  const tables = await db.select().from(tablesTable).where(eq(tablesTable.outletId, outletId));
  const tableMap = new Map(tables.map(t => [t.id, t.name]));
  res.json({ ...fmtOrder(order), tableName: order.tableId ? tableMap.get(order.tableId) || null : null });
});

router.put("/:orderId", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const orderId = parseInt(req.params.orderId);
  const { status, items, discountType, discountValue, paymentMethod, notes, tableId } = req.body;

  let updates: any = { updatedAt: new Date() };
  if (status) updates.status = status;
  if (paymentMethod) updates.paymentMethod = paymentMethod;
  if (notes !== undefined) updates.notes = notes;
  if (tableId !== undefined) updates.tableId = tableId;
  if (discountType !== undefined) updates.discountType = discountType;
  if (discountValue !== undefined) updates.discountValue = String(discountValue);

  if (items && items.length > 0) {
    const { enrichedItems, subtotal, discountAmount, taxAmount, totalAmount } = await calcTotals(items, outletId, discountType, discountValue);
    updates.items = enrichedItems; updates.subtotal = String(subtotal);
    updates.discountAmount = String(discountAmount); updates.taxAmount = String(taxAmount); updates.totalAmount = String(totalAmount);
  }

  const [order] = await db.update(ordersTable).set(updates)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.outletId, outletId))).returning();

  // If cancelled, free the table
  if (status === "cancelled" && order.tableId) {
    await db.update(tablesTable).set({ status: "available", currentOrderId: null }).where(eq(tablesTable.id, order.tableId));
  }

  res.json(fmtOrder(order));
});

// Bill generation
router.post("/:orderId/bill", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const orderId = parseInt(req.params.orderId);
  const { paymentMethod, splitPayments, discountType, discountValue, customerId, loyaltyPointsRedeemed } = req.body;

  const [order] = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.outletId, outletId))).limit(1);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  let finalSubtotal = parseFloat(order.subtotal);
  let discountAmount = 0;
  if (discountType && discountValue) {
    if (discountType === "percent") discountAmount = (finalSubtotal * discountValue) / 100;
    else discountAmount = discountValue;
  }

  const [settings] = await db.select().from(outletSettingsTable).where(eq(outletSettingsTable.outletId, outletId)).limit(1);
  const gstRate = settings ? parseFloat(settings.gstRate) : 5;
  const taxAmount = ((finalSubtotal - discountAmount) * gstRate) / 100;
  const totalAmount = finalSubtotal - discountAmount + taxAmount;

  // Loyalty points
  const loyaltyPerRupee = settings ? parseFloat(settings.loyaltyPointsPerRupee) : 1;
  const earned = Math.floor(totalAmount * loyaltyPerRupee);
  const redeemed = loyaltyPointsRedeemed || 0;

  const [bill] = await db.insert(billsTable).values({
    outletId, orderId, billNumber: billNum(),
    items: order.items as any, subtotal: String(finalSubtotal),
    discountAmount: String(discountAmount), taxAmount: String(taxAmount), totalAmount: String(totalAmount),
    paymentMethod, splitPayments: splitPayments || null,
    loyaltyPointsEarned: earned, loyaltyPointsRedeemed: redeemed,
  }).returning();

  // Mark order as paid & update table
  await db.update(ordersTable).set({
    status: "paid", paymentStatus: "paid", paymentMethod,
    discountType: discountType || null, discountValue: discountValue ? String(discountValue) : null,
    discountAmount: String(discountAmount), taxAmount: String(taxAmount), totalAmount: String(totalAmount),
    updatedAt: new Date(),
  }).where(eq(ordersTable.id, orderId));

  if (order.tableId) {
    await db.update(tablesTable).set({ status: "available", currentOrderId: null }).where(eq(tablesTable.id, order.tableId));
  }

  // Update customer loyalty
  if (customerId) {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, customerId)).limit(1);
    if (customer) {
      await db.update(customersTable).set({
        loyaltyPoints: customer.loyaltyPoints + earned - redeemed,
        totalOrders: customer.totalOrders + 1,
        totalSpent: String(parseFloat(customer.totalSpent) + totalAmount),
        lastVisit: new Date(), updatedAt: new Date(),
      }).where(eq(customersTable.id, customerId));
    }
  }

  const [outletData] = await db.select().from(outletsTable).where(eq(outletsTable.id, outletId)).limit(1);

  res.json({
    id: bill.id, orderId, billNumber: bill.billNumber,
    items: (bill.items as any[]) || [],
    subtotal: parseFloat(bill.subtotal), discountAmount: parseFloat(bill.discountAmount),
    taxAmount: parseFloat(bill.taxAmount), totalAmount: parseFloat(bill.totalAmount),
    paymentMethod, splitPayments: bill.splitPayments || null,
    loyaltyPointsEarned: bill.loyaltyPointsEarned, loyaltyPointsRedeemed: bill.loyaltyPointsRedeemed,
    createdAt: bill.createdAt.toISOString(),
    outlet: outletData ? { ...outletData, createdAt: outletData.createdAt.toISOString(), updatedAt: outletData.updatedAt.toISOString() } : {},
  });
});

// KOT generation
router.post("/:orderId/kot", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const orderId = parseInt(req.params.orderId);
  const [order] = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.outletId, outletId))).limit(1);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const [kot] = await db.insert(kotsTable).values({
    outletId, orderId, kotNumber: kotNum(), station: "kitchen",
    status: "pending", items: order.items as any,
  }).returning();

  res.json({
    ...kot, items: (kot.items as any[]) || [],
    orderNumber: order.orderNumber, orderType: order.type,
    tableName: null, tableId: order.tableId,
    createdAt: kot.createdAt.toISOString(), updatedAt: kot.updatedAt.toISOString(),
  });
});

export default router;
