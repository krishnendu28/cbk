import { z } from "zod";

const orderItemSchema = z.object({
  menuItemId: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1),
  variant: z.string().trim().min(1).default("Regular"),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  totalPrice: z.coerce.number().nonnegative(),
});

const phoneSchema = z
  .string()
  .trim()
  .min(1)
  .transform((value) => String(value).replace(/\D/g, ""))
  .refine((value) => value.length >= 10 && value.length <= 15, {
    message: "Phone number must contain 10 to 15 digits.",
  });

export const orderIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

function normalizeDateOfBirth(value) {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const dayFirst = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dayFirst) {
    const day = dayFirst[1].padStart(2, "0");
    const month = dayFirst[2].padStart(2, "0");
    return `${dayFirst[3]}-${month}-${day}`;
  }

  return trimmed;
}

function normalizeCustomerName(value) {
  if (value === undefined || value === null) return "Customer";
  const trimmed = String(value).trim();
  return trimmed.length >= 2 ? trimmed : "Customer";
}

export const createOrderSchema = z.object({
  customerName: z.preprocess(normalizeCustomerName, z.string().trim().min(2).max(120)),
  phone: phoneSchema,
  dateOfBirth: z.preprocess(
    normalizeDateOfBirth,
    z
      .string()
      .trim()
      .refine(
        (value) =>
          /^\d{4}-\d{2}-\d{2}$/.test(value) &&
          !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()) &&
          new Date(`${value}T00:00:00.000Z`).getTime() <= Date.now(),
        { message: "Invalid date of birth." },
      )
      .optional(),
  ),
  address: z.string().trim().min(5).max(300),
  instructions: z.string().trim().max(300).optional().default(""),
  items: z.array(orderItemSchema).min(1),
  subtotal: z.coerce.number().nonnegative().optional(),
  discountEnabled: z.boolean().optional(),
  discountRate: z.coerce.number().min(0).max(100).optional(),
  discountAmount: z.coerce.number().nonnegative().optional(),
  total: z.coerce.number().nonnegative(),
  deliveryCharge: z.coerce.number().nonnegative().optional(),
  deliveryEtaMinutes: z.coerce.number().int().min(15).max(180).optional(),
  promoCode: z.string().trim().max(40).optional().default(""),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["Preparing", "Ready", "Delivered"]),
});
