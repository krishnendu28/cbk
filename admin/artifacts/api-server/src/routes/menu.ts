import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, menuItemsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router({ mergeParams: true });

// CATEGORIES
router.get("/categories", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const cats = await db.select().from(categoriesTable).where(eq(categoriesTable.outletId, outletId));
  const items = await db.select().from(menuItemsTable).where(eq(menuItemsTable.outletId, outletId));
  res.json(cats.map(c => ({
    ...c, createdAt: c.createdAt.toISOString(),
    itemCount: items.filter(i => i.categoryId === c.id).length,
  })));
});

router.post("/categories", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const [cat] = await db.insert(categoriesTable).values({ ...req.body, outletId }).returning();
  res.status(201).json({ ...cat, createdAt: cat.createdAt.toISOString(), itemCount: 0 });
});

router.put("/categories/:categoryId", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const categoryId = parseInt(req.params.categoryId);
  const [cat] = await db.update(categoriesTable).set(req.body)
    .where(and(eq(categoriesTable.id, categoryId), eq(categoriesTable.outletId, outletId))).returning();
  const items = await db.select().from(menuItemsTable).where(eq(menuItemsTable.categoryId, categoryId));
  res.json({ ...cat, createdAt: cat.createdAt.toISOString(), itemCount: items.length });
});

router.delete("/categories/:categoryId", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const categoryId = parseInt(req.params.categoryId);
  await db.delete(categoriesTable).where(and(eq(categoriesTable.id, categoryId), eq(categoriesTable.outletId, outletId)));
  res.json({ success: true, message: "Category deleted" });
});

// MENU ITEMS
function fmtItem(item: typeof menuItemsTable.$inferSelect, catName: string) {
  return {
    ...item,
    basePrice: parseFloat(item.basePrice),
    taxRate: parseFloat(item.taxRate),
    categoryName: catName,
    variants: (item.variants as any[]) || [],
    addons: (item.addons as any[]) || [],
    tags: (item.tags as string[]) || [],
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

router.get("/menu-items", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const { categoryId, available } = req.query;
  let query = db.select().from(menuItemsTable).where(eq(menuItemsTable.outletId, outletId));
  const items = await query;
  const cats = await db.select().from(categoriesTable).where(eq(categoriesTable.outletId, outletId));
  const catMap = new Map(cats.map(c => [c.id, c.name]));
  let filtered = items;
  if (categoryId) filtered = filtered.filter(i => i.categoryId === parseInt(categoryId as string));
  if (available !== undefined) filtered = filtered.filter(i => i.isAvailable === (available === "true"));
  res.json(filtered.map(i => fmtItem(i, catMap.get(i.categoryId) || "")));
});

router.post("/menu-items", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const [item] = await db.insert(menuItemsTable).values({
    ...req.body, outletId,
    basePrice: String(req.body.basePrice),
    taxRate: String(req.body.taxRate ?? "18.00"),
    variants: req.body.variants || [],
    addons: req.body.addons || [],
    tags: req.body.tags || [],
  }).returning();
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, item.categoryId)).limit(1);
  res.status(201).json(fmtItem(item, cat?.name || ""));
});

router.get("/menu-items/:itemId", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const itemId = parseInt(req.params.itemId);
  const [item] = await db.select().from(menuItemsTable)
    .where(and(eq(menuItemsTable.id, itemId), eq(menuItemsTable.outletId, outletId))).limit(1);
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, item.categoryId)).limit(1);
  res.json(fmtItem(item, cat?.name || ""));
});

router.put("/menu-items/:itemId", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const itemId = parseInt(req.params.itemId);
  const updates: any = { ...req.body, updatedAt: new Date() };
  if (updates.basePrice !== undefined) updates.basePrice = String(updates.basePrice);
  if (updates.taxRate !== undefined) updates.taxRate = String(updates.taxRate);
  const [item] = await db.update(menuItemsTable).set(updates)
    .where(and(eq(menuItemsTable.id, itemId), eq(menuItemsTable.outletId, outletId))).returning();
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, item.categoryId)).limit(1);
  res.json(fmtItem(item, cat?.name || ""));
});

router.delete("/menu-items/:itemId", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const itemId = parseInt(req.params.itemId);
  await db.delete(menuItemsTable).where(and(eq(menuItemsTable.id, itemId), eq(menuItemsTable.outletId, outletId)));
  res.json({ success: true, message: "Item deleted" });
});

export default router;
