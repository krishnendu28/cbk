import { Router } from "express";
import { requireAdmin } from "../middlewares/auth.js";

const router = Router();

function parseRoleKeyPairs(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [role, key] = entry.split(":");
      return {
        role: String(role || "").trim().toLowerCase(),
        key: String(key || "").trim(),
      };
    })
    .filter((entry) => entry.role && entry.key);
}

function loadAdminKeys() {
  const fromPairs = parseRoleKeyPairs(process.env.ADMIN_API_KEYS);
  if (fromPairs.length > 0) {
    return fromPairs;
  }

  const legacyKey = String(process.env.ADMIN_API_KEY || "").trim();
  if (legacyKey) {
    return [{ role: "owner", key: legacyKey }];
  }

  return [];
}

function getExpectedCredentials() {
  const email = String(process.env.ADMIN_LOGIN_EMAIL || "owner@tabio.com").trim().toLowerCase();
  const password = String(process.env.ADMIN_LOGIN_PASSWORD || "demo1234").trim();
  return { email, password };
}

function buildUser(role = "owner") {
  return {
    id: 1,
    email: "owner@tabio.com",
    name: "Chakhna Owner",
    role,
    outletId: 1,
    createdAt: new Date().toISOString(),
  };
}

router.post("/auth/login", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "").trim();
  const expected = getExpectedCredentials();

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  if (email !== expected.email || password !== expected.password) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const admins = loadAdminKeys();
  const enforceAdminAuth = String(process.env.ENFORCE_ADMIN_AUTH || "false").toLowerCase() === "true";

  if (admins.length === 0 && enforceAdminAuth) {
    return res.status(503).json({ message: "Admin auth is not configured." });
  }

  const matched = admins.find((entry) => entry.role === "owner") || admins[0] || null;
  const token = matched?.key || "dev-owner-token";
  const role = matched?.role || "owner";

  return res.json({
    user: buildUser(role),
    token,
  });
});

router.get("/auth/me", requireAdmin(["owner", "manager"]), (req, res) => {
  const role = req.admin?.role || "owner";
  return res.json(buildUser(role));
});

router.post("/auth/logout", (_req, res) => {
  return res.json({ success: true, message: "Logged out" });
});

export default router;