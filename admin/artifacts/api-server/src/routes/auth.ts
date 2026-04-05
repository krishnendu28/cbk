import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, sessionsTable } from "@workspace/db/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

function hashPassword(pw: string) {
  return crypto.createHash("sha256").update(pw + "tabio_salt").digest("hex");
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }
  const hashed = hashPassword(password);
  const [user] = await db.select().from(usersTable)
    .where(and(eq(usersTable.email, email), eq(usersTable.password, hashed), eq(usersTable.isActive, true)))
    .limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(sessionsTable).values({ userId: user.id, token, expiresAt });
  res.cookie("session_token", token, { httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
  const { password: _, ...safeUser } = user;
  res.json({ user: { ...safeUser, createdAt: safeUser.createdAt.toISOString() }, token });
});

router.get("/me", async (req, res) => {
  const token = req.cookies?.session_token || req.headers.authorization?.replace("Bearer ", "");
  if (!token) { res.status(401).json({ error: "Not authenticated" }); return; }
  const [session] = await db.select().from(sessionsTable)
    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, new Date())))
    .limit(1);
  if (!session) { res.status(401).json({ error: "Session expired" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }
  const { password: _, ...safeUser } = user;
  res.json({ ...safeUser, createdAt: safeUser.createdAt.toISOString() });
});

router.post("/logout", async (req, res) => {
  const token = req.cookies?.session_token || req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  res.clearCookie("session_token");
  res.json({ success: true, message: "Logged out" });
});

export default router;
