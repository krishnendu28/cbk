import { z } from "zod";

export const broadcastNotificationSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(220, "Message is too long"),
});

export const registerDeviceTokenSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^(Expo|Exponent)PushToken\[[^\]]+\]$/, "Invalid Expo push token"),
  platform: z.enum(["android", "ios", "unknown"]).default("unknown"),
  phone: z.string().trim().min(7).max(20).optional().nullable(),
});
