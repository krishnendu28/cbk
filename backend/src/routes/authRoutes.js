import crypto from "crypto";
import { Router } from "express";
import { requireAdmin } from "../middlewares/auth.js";
import { requestOtp, verifyOtp } from "../services/otpService.js";
import { sendOtpEmail } from "../services/emailService.js";

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

const LOGIN_FAILURE_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;
const loginFailures = new Map();

function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "")
    .split(",")[0]
    .trim() || "unknown";
}

function getExpectedCredentials() {
  const email = String(process.env.ADMIN_LOGIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.ADMIN_LOGIN_PASSWORD || "").trim();
  if (!email || !password) return null;
  return { email, password };
}

function trackLoginFailure(key) {
  const entry = loginFailures.get(key) || { count: 0, firstAt: Date.now() };
  if (Date.now() - entry.firstAt > LOGIN_FAILURE_WINDOW_MS) {
    loginFailures.set(key, { count: 1, firstAt: Date.now() });
    return 1;
  }
  entry.count += 1;
  loginFailures.set(key, entry);
  return entry.count;
}

function loginIsLocked(key) {
  const entry = loginFailures.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > LOGIN_FAILURE_WINDOW_MS) {
    loginFailures.delete(key);
    return false;
  }
  return entry.count >= LOGIN_MAX_FAILURES;
}

function buildUser(role = "owner") {
  const email = getExpectedCredentials()?.email || "owner";
  return {
    id: role === "owner" ? 1 : 2,
    email,
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

  if (!expected) {
    return res.status(503).json({ message: "Admin login is not configured." });
  }

  const failureKey = `${email}|${clientIp(req)}`;
  if (loginIsLocked(failureKey)) {
    return res.status(429).json({ message: "Too many failed login attempts. Please try again later." });
  }

  if (email !== expected.email || password !== expected.password) {
    trackLoginFailure(failureKey);
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

  loginFailures.delete(failureKey);

  return res.json({
    user: buildUser(role),
    token,
  });
});

router.post("/auth/otp/send", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim();
    const result = await requestOtp({ email });

    if (!result.ok) {
      return res.status(result.status).json({ message: result.error });
    }

    const mailResult = await sendOtpEmail({ to: email.toLowerCase(), otp: result.otp });

    return res.status(200).json({
      message: `OTP sent to ${result.maskedEmail}.`,
      maskedEmail: result.maskedEmail,
      devOtp: mailResult.devMode ? mailResult.otp : undefined,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/auth/otp/verify", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "");
    const otp = String(req.body?.otp || "");
    const name = String(req.body?.name || "").trim();

    const result = await verifyOtp({ email, otp });
    if (!result.ok) {
      return res.status(result.status).json({ message: result.error });
    }

    const user = {
      id: crypto.randomUUID(),
      email: result.email,
      name: name || result.email.split("@")[0] || "Chakhna User",
      role: "user",
      outletId: 1,
      createdAt: new Date().toISOString(),
    };

    return res.json({
      user,
      token: crypto.randomUUID(),
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/auth/me", requireAdmin(["owner", "manager"]), (req, res) => {
  const role = req.admin?.role || "owner";
  return res.json(buildUser(role));
});

router.post("/auth/logout", (_req, res) => {
  return res.json({ success: true, message: "Logged out" });
});

export default router;