import { Router } from "express";
import { db } from "@workspace/db";
import { kotsTable, ordersTable, tablesTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const { status } = req.query;
  let kots = await db.select().from(kotsTable).where(eq(kotsTable.outletId, outletId)).orderBy(desc(kotsTable.createdAt));
  if (status) kots = kots.filter(k => k.status === status);

  const orders = await db.select().from(ordersTable).where(eq(ordersTable.outletId, outletId));
  const tables = await db.select().from(tablesTable).where(eq(tablesTable.outletId, outletId));
  const orderMap = new Map(orders.map(o => [o.id, o]));
  const tableMap = new Map(tables.map(t => [t.id, t.name]));

  res.json(kots.map(k => {
    const order = orderMap.get(k.orderId);
    return {
      ...k, items: (k.items as any[]) || [],
      orderNumber: order?.orderNumber || "N/A",
      orderType: order?.type || "dine-in",
      tableId: order?.tableId || null,
      tableName: order?.tableId ? tableMap.get(order.tableId) || null : null,
      createdAt: k.createdAt.toISOString(), updatedAt: k.updatedAt.toISOString(),
    };
  }));
});

router.put("/:kotId", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const kotId = parseInt(req.params.kotId);
  const { status } = req.body;
  const [kot] = await db.update(kotsTable).set({ status, updatedAt: new Date() })
    .where(and(eq(kotsTable.id, kotId), eq(kotsTable.outletId, outletId))).returning();

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, kot.orderId)).limit(1);
  const tables = await db.select().from(tablesTable).where(eq(tablesTable.outletId, outletId));
  const tableMap = new Map(tables.map(t => [t.id, t.name]));

  res.json({
    ...kot, items: (kot.items as any[]) || [],
    orderNumber: order?.orderNumber || "N/A",
    orderType: order?.type || "dine-in",
    tableId: order?.tableId || null,
    tableName: order?.tableId ? tableMap.get(order.tableId) || null : null,
    createdAt: kot.createdAt.toISOString(), updatedAt: kot.updatedAt.toISOString(),
  });
});

export default router;
