import { z } from "zod";

export const broadcastNotificationSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(220, "Message is too long"),
  discountRate: z.coerce.number().min(0).max(100).optional(),
  discountCode: z.string().trim().max(40).optional(),
  expiresInHours: z.coerce.number().int().min(1).max(720).optional(),
});

export const registerDeviceTokenSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^(Expo|Exponent)PushToken\[[^\]]+\]$/, "Invalid Expo push token"),
  platform: z.enum(["android", "ios", "unknown"]).default("unknown"),
  phone: z.string().trim().min(7).max(20).optional().nullable(),
});
