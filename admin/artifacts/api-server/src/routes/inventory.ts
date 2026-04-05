import { Router } from "express";
import { db } from "@workspace/db";
import { inventoryTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router({ mergeParams: true });

function fmt(i: typeof inventoryTable.$inferSelect) {
  return {
    ...i,
    currentStock: parseFloat(i.currentStock), minStock: parseFloat(i.minStock),
    maxStock: parseFloat(i.maxStock), costPerUnit: parseFloat(i.costPerUnit),
    isLowStock: parseFloat(i.currentStock) <= parseFloat(i.minStock),
    lastUpdated: i.lastUpdated.toISOString(), createdAt: i.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const { lowStock } = req.query;
  const items = await db.select().from(inventoryTable).where(eq(inventoryTable.outletId, outletId));
  let result = items.map(fmt);
  if (lowStock === "true") result = result.filter(i => i.isLowStock);
  res.json(result);
});

router.post("/", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const body = req.body;
  const [item] = await db.insert(inventoryTable).values({
    ...body, outletId,
    currentStock: String(body.currentStock), minStock: String(body.minStock),
    maxStock: String(body.maxStock), costPerUnit: String(body.costPerUnit),
  }).returning();
  res.status(201).json(fmt(item));
});

router.put("/:itemId", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const itemId = parseInt(req.params.itemId);
  const body = req.body;
  const updates: any = { ...body };
  if (body.currentStock !== undefined) updates.currentStock = String(body.currentStock);
  if (body.minStock !== undefined) updates.minStock = String(body.minStock);
  if (body.maxStock !== undefined) updates.maxStock = String(body.maxStock);
  if (body.costPerUnit !== undefined) updates.costPerUnit = String(body.costPerUnit);
  const [item] = await db.update(inventoryTable).set(updates)
    .where(and(eq(inventoryTable.id, itemId), eq(inventoryTable.outletId, outletId))).returning();
  res.json(fmt(item));
});

router.delete("/:itemId", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const itemId = parseInt(req.params.itemId);
  await db.delete(inventoryTable).where(and(eq(inventoryTable.id, itemId), eq(inventoryTable.outletId, outletId)));
  res.json({ success: true, message: "Deleted" });
});

router.post("/:itemId/adjust", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const itemId = parseInt(req.params.itemId);
  const { adjustment, reason } = req.body;
  const [current] = await db.select().from(inventoryTable)
    .where(and(eq(inventoryTable.id, itemId), eq(inventoryTable.outletId, outletId))).limit(1);
  if (!current) { res.status(404).json({ error: "Not found" }); return; }
  const newStock = Math.max(0, parseFloat(current.currentStock) + adjustment);
  const [item] = await db.update(inventoryTable).set({ currentStock: String(newStock), lastUpdated: new Date() })
    .where(eq(inventoryTable.id, itemId)).returning();
  res.json(fmt(item));
});

export default router;
