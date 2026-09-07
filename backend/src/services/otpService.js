import crypto from "crypto";
import mongoose from "mongoose";
import { OtpCode } from "../models/OtpCode.js";
import { logger } from "../utils/logger.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const memoryOtpStore = new Map();

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

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

function pruneMemory() {
  const now = Date.now();
  for (const [email, entry] of memoryOtpStore.entries()) {
    if (entry.expiresAt <= now) {
      memoryOtpStore.delete(email);
    }
  }
}

export async function requestOtp({ email }) {
  const normalized = normalizeEmail(email);

  if (!isValidEmailFormat(normalized)) {
    return { ok: false, status: 400, error: "Please enter a valid email address." };
  }

  pruneMemory();

  if (isMongoConnected()) {
    try {
      const existing = await OtpCode.findOne({ email: normalized });
      if (existing) {
        const sentAt = existing.sentAt instanceof Date ? existing.sentAt.getTime() : new Date(existing.sentAt).getTime();
        const waitMs = sentAt + OTP_RESEND_COOLDOWN_MS - Date.now();
        if (waitMs > 0) {
          return {
            ok: false,
            status: 429,
            error: `Please wait ${Math.ceil(waitMs / 1000)}s before requesting another OTP.`,
          };
        }
      }

      const otp = generateOtp();
      await OtpCode.updateOne(
        { email: normalized },
        { $set: { otp, expiresAt: new Date(Date.now() + OTP_TTL_MS), sentAt: new Date(), attempts: 0 } },
        { upsert: true },
      );

      logger.info("otp.issued", { email: normalized });
      return { ok: true, status: 200, maskedEmail: maskEmail(normalized), otp };
    } catch (error) {
      logger.warn("otp.mongo_request_fallback_memory", { email: normalized, reason: error?.message || String(error) });
    }
  }

  const existing = memoryOtpStore.get(normalized);
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
  memoryOtpStore.set(normalized, {
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
    sentAt: Date.now(),
    attempts: 0,
  });

  logger.info("otp.issued", { email: normalized });
  return { ok: true, status: 200, maskedEmail: maskEmail(normalized), otp };
}

export async function verifyOtp({ email, otp }) {
  const normalized = normalizeEmail(email);
  const code = String(otp || "").trim();

  if (!isValidEmailFormat(normalized) || !code) {
    return { ok: false, status: 400, error: "Email and OTP are required." };
  }

  pruneMemory();

  if (isMongoConnected()) {
    try {
      const entry = await OtpCode.findOne({ email: normalized });
      if (!entry) {
        return { ok: false, status: 400, error: "No OTP was requested for this email or it has expired." };
      }

      const expiresAt = entry.expiresAt instanceof Date ? entry.expiresAt.getTime() : new Date(entry.expiresAt).getTime();
      if (expiresAt <= Date.now()) {
        await OtpCode.deleteOne({ email: normalized });
        return { ok: false, status: 400, error: "This OTP has expired. Please request a new one." };
      }

      if (entry.attempts >= OTP_MAX_ATTEMPTS) {
        await OtpCode.deleteOne({ email: normalized });
        return { ok: false, status: 429, error: "Too many incorrect attempts. Please request a new OTP." };
      }

      if (entry.otp !== code) {
        await OtpCode.updateOne({ email: normalized }, { $set: { attempts: Number(entry.attempts) + 1 } });
        return { ok: false, status: 401, error: "Incorrect OTP. Please try again." };
      }

      await OtpCode.deleteOne({ email: normalized });
      return { ok: true, status: 200, email: normalized };
    } catch (error) {
      logger.warn("otp.mongo_verify_fallback_memory", { email: normalized, reason: error?.message || String(error) });
    }
  }

  const entry = memoryOtpStore.get(normalized);
  if (!entry) {
    return { ok: false, status: 400, error: "No OTP was requested for this email or it has expired." };
  }

  if (entry.expiresAt <= Date.now()) {
    memoryOtpStore.delete(normalized);
    return { ok: false, status: 400, error: "This OTP has expired. Please request a new one." };
  }

  if (entry.attempts >= OTP_MAX_ATTEMPTS) {
    memoryOtpStore.delete(normalized);
    return { ok: false, status: 429, error: "Too many incorrect attempts. Please request a new OTP." };
  }

  if (entry.otp !== code) {
    entry.attempts += 1;
    return { ok: false, status: 401, error: "Incorrect OTP. Please try again." };
  }

  memoryOtpStore.delete(normalized);
  return { ok: true, status: 200, email: normalized };
}