import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable } from "@workspace/db/schema";
import { eq, and, like, or } from "drizzle-orm";

const router = Router({ mergeParams: true });

function fmt(c: typeof customersTable.$inferSelect) {
  return {
    ...c,
    totalSpent: parseFloat(c.totalSpent),
    lastVisit: c.lastVisit?.toISOString() || null,
    createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const { search } = req.query;
  let customers = await db.select().from(customersTable).where(eq(customersTable.outletId, outletId));
  if (search) {
    const s = (search as string).toLowerCase();
    customers = customers.filter(c => c.name.toLowerCase().includes(s) || c.phone.includes(s) || (c.email || "").toLowerCase().includes(s));
  }
  res.json(customers.map(fmt));
});

router.post("/", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const [customer] = await db.insert(customersTable).values({ ...req.body, outletId }).returning();
  res.status(201).json(fmt(customer));
});

router.get("/:customerId", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const customerId = parseInt(req.params.customerId);
  const [customer] = await db.select().from(customersTable)
    .where(and(eq(customersTable.id, customerId), eq(customersTable.outletId, outletId))).limit(1);
  if (!customer) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fmt(customer));
});

router.put("/:customerId", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const customerId = parseInt(req.params.customerId);
  const [customer] = await db.update(customersTable).set({ ...req.body, updatedAt: new Date() })
    .where(and(eq(customersTable.id, customerId), eq(customersTable.outletId, outletId))).returning();
  res.json(fmt(customer));
});

router.post("/:customerId/loyalty", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const customerId = parseInt(req.params.customerId);
  const { points, reason } = req.body;
  const [current] = await db.select().from(customersTable)
    .where(and(eq(customersTable.id, customerId), eq(customersTable.outletId, outletId))).limit(1);
  if (!current) { res.status(404).json({ error: "Not found" }); return; }
  const newPoints = Math.max(0, current.loyaltyPoints + points);
  const [customer] = await db.update(customersTable).set({ loyaltyPoints: newPoints, updatedAt: new Date() })
    .where(eq(customersTable.id, customerId)).returning();
  res.json(fmt(customer));
});

export default router;
