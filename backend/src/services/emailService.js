import nodemailer from "nodemailer";
import { logger } from "../utils/logger.js";

function readConfig(key, fallback = "") {
  return String(process.env[key] || fallback).trim();
}

export function isEmailConfigured() {
  return Boolean(
    readConfig("SMTP_HOST") &&
      (readConfig("SMTP_USER") || readConfig("SMTP_PASS")) &&
      readConfig("SMTP_FROM"),
  );
}

function getTransport() {
  return nodemailer.createTransport({
    host: readConfig("SMTP_HOST", "smtp.gmail.com"),
    port: Number(readConfig("SMTP_PORT", "587")),
    secure: readConfig("SMTP_SECURE", "false").toLowerCase() === "true",
    auth: {
      user: readConfig("SMTP_USER"),
      pass: readConfig("SMTP_PASS"),
    },
  });
}

export async function sendOtpEmail({ to, otp }) {
  const from = readConfig("SMTP_FROM");
  const subject = "Your Chakhna By Kilo login OTP";
  const text = [
    `Hi there,`,
    ``,
    `Your one-time password (OTP) to log in to Chakhna By Kilo is:`,
    ``,
    `  ${otp}`,
    ``,
    `This OTP is valid for 5 minutes. Please do not share it with anyone.`,
    ``,
    `— Chakhna By Kilo`,
  ].join("\n");

  if (!isEmailConfigured()) {
    logger.info("email.otp_dev_mode", { to, otp });
    return { devMode: true, otp };
  }

  try {
    const transport = getTransport();
    await transport.sendMail({
      from,
      to,
      subject,
      text,
    });
    logger.info("email.otp_sent", { to });
    return { devMode: false };
  } catch (error) {
    logger.error("email.otp_send_failed", { to, reason: error?.message || String(error) });
    throw error;
  }
}