import { NextFunction, Request, Response } from "express";
import { db } from "@workspace/db";
import { sessionsTable, usersTable } from "@workspace/db/schema";
import { and, eq, gt } from "drizzle-orm";

export type AppRole = "owner" | "manager" | "cashier" | "kitchen" | "waiter";

type AuthUser = {
  id: number;
  outletId: number | null;
  role: AppRole;
  isActive: boolean;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.session_token;
  if (typeof cookieToken === "string" && cookieToken.trim()) {
    return cookieToken;
  }

  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();
    return token || null;
  }

  return null;
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, new Date())))
    .limit(1);

  if (!session) {
    res.status(401).json({ error: "Session expired" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, session.userId))
    .limit(1);

  if (!user || !user.isActive) {
    res.status(401).json({ error: "User not found or inactive" });
    return;
  }

  req.user = {
    id: user.id,
    outletId: user.outletId,
    role: user.role as AppRole,
    isActive: user.isActive,
  };

  next();
}

export function authorize(...allowedRoles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    next();
  };
}

export function authorizeOutletAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const rawOutletId = (req.params as { outletId?: string }).outletId;
  if (!rawOutletId) {
    next();
    return;
  }

  const outletId = Number(rawOutletId);
  if (!Number.isFinite(outletId) || outletId <= 0) {
    res.status(400).json({ error: "Invalid outlet id" });
    return;
  }

  if (req.user.outletId && req.user.outletId !== outletId && req.user.role !== "owner") {
    res.status(403).json({ error: "Forbidden for this outlet" });
    return;
  }

  next();
}
