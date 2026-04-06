import { z } from "zod";

const orderItemSchema = z.object({
  name: z.string().trim().min(1),
  variant: z.string().trim().min(1).default("Regular"),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  totalPrice: z.coerce.number().nonnegative(),
});

export const orderIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const createOrderSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(25),
  dateOfBirth: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  address: z.string().trim().min(5).max(300),
  items: z.array(orderItemSchema).min(1),
  total: z.coerce.number().nonnegative(),
  deliveryCharge: z.coerce.number().nonnegative().default(0),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["Preparing", "Ready", "Delivered"]),
});
