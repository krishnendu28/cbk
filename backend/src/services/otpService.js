import crypto from "crypto";
import { logger } from "../utils/logger.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const otpStore = new Map();

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function isValidEmailFormat(value) {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function maskEmail(email) {
  const [local, domain] = email.split("@");
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(local.length - 2, 0))}@${domain}`;
}

function pruneExpired() {
  const now = Date.now();
  for (const [email, entry] of otpStore.entries()) {
    if (entry.expiresAt <= now) {
      otpStore.delete(email);
    }
  }
}

export function requestOtp({ email }) {
  pruneExpired();
  const normalized = normalizeEmail(email);

  if (!isValidEmailFormat(normalized)) {
    return { ok: false, status: 400, error: "Please enter a valid email address." };
  }

  const existing = otpStore.get(normalized);
  if (existing) {
    const waitMs = existing.sentAt + OTP_RESEND_COOLDOWN_MS - Date.now();
    if (waitMs > 0) {
      const seconds = Math.ceil(waitMs / 1000);
      return {
        ok: false,
        status: 429,
        error: `Please wait ${seconds}s before requesting another OTP.`,
      };
    }
  }

  const otp = generateOtp();
  otpStore.set(normalized, {
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
    sentAt: Date.now(),
    attempts: 0,
  });

  logger.info("otp.issued", { email: normalized });
  return { ok: true, status: 200, maskedEmail: maskEmail(normalized), otp };
}

export function verifyOtp({ email, otp }) {
  pruneExpired();
  const normalized = normalizeEmail(email);
  const code = String(otp || "").trim();

  if (!isValidEmailFormat(normalized) || !code) {
    return { ok: false, status: 400, error: "Email and OTP are required." };
  }

  const entry = otpStore.get(normalized);
  if (!entry) {
    return { ok: false, status: 400, error: "No OTP was requested for this email or it has expired." };
  }

  if (entry.expiresAt <= Date.now()) {
    otpStore.delete(normalized);
    return { ok: false, status: 400, error: "This OTP has expired. Please request a new one." };
  }

  if (entry.attempts >= OTP_MAX_ATTEMPTS) {
    otpStore.delete(normalized);
    return { ok: false, status: 429, error: "Too many incorrect attempts. Please request a new OTP." };
  }

  if (entry.otp !== code) {
    entry.attempts += 1;
    return { ok: false, status: 401, error: "Incorrect OTP. Please try again." };
  }

  otpStore.delete(normalized);
  return { ok: true, status: 200, email: normalized };
}