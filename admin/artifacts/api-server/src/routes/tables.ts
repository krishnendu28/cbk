import { Router } from "express";
import { db } from "@workspace/db";
import { tablesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router({ mergeParams: true });

function fmt(t: typeof tablesTable.$inferSelect) {
  return { ...t, updatedAt: t.updatedAt.toISOString() };
}

router.get("/", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const tables = await db.select().from(tablesTable).where(eq(tablesTable.outletId, outletId));
  res.json(tables.map(fmt));
});

router.post("/", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const [table] = await db.insert(tablesTable).values({ ...req.body, outletId }).returning();
  res.status(201).json(fmt(table));
});

router.put("/:tableId", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const tableId = parseInt(req.params.tableId);
  const [table] = await db.update(tablesTable).set({ ...req.body, updatedAt: new Date() })
    .where(and(eq(tablesTable.id, tableId), eq(tablesTable.outletId, outletId))).returning();
  res.json(fmt(table));
});

router.delete("/:tableId", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const tableId = parseInt(req.params.tableId);
  await db.delete(tablesTable).where(and(eq(tablesTable.id, tableId), eq(tablesTable.outletId, outletId)));
  res.json({ success: true, message: "Table deleted" });
});

export default router;
