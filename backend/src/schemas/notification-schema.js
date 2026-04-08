import { z } from "zod";

export const broadcastNotificationSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(220, "Message is too long"),
});
