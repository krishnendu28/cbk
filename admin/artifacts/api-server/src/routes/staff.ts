import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const router = Router({ mergeParams: true });

function hashPassword(pw: string) {
  return crypto.createHash("sha256").update(pw + "tabio_salt").digest("hex");
}

function safe(u: typeof usersTable.$inferSelect) {
  const { password: _, ...s } = u;
  return { ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() };
}

router.get("/", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const staff = await db.select().from(usersTable).where(eq(usersTable.outletId, outletId));
  res.json(staff.map(safe));
});

router.post("/", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const { password, ...rest } = req.body;
  const [user] = await db.insert(usersTable).values({
    ...rest, outletId, password: hashPassword(password || "tabio1234"), isActive: rest.isActive ?? true,
  }).returning();
  res.status(201).json(safe(user));
});

router.put("/:staffId", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const staffId = parseInt(req.params.staffId);
  const { password, ...rest } = req.body;
  const updates: any = { ...rest, updatedAt: new Date() };
  if (password) updates.password = hashPassword(password);
  const [user] = await db.update(usersTable).set(updates)
    .where(and(eq(usersTable.id, staffId), eq(usersTable.outletId, outletId))).returning();
  res.json(safe(user));
});

router.delete("/:staffId", async (req, res) => {
  const outletId = parseInt((req.params as { outletId?: string }).outletId!);
  const staffId = parseInt(req.params.staffId);
  await db.update(usersTable).set({ isActive: false }).where(and(eq(usersTable.id, staffId), eq(usersTable.outletId, outletId)));
  res.json({ success: true, message: "Staff deactivated" });
});

export default router;
