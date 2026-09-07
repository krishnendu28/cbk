import { z } from "zod";
import { MONTHLY_PLANS_FLAT, MONTHLY_PLAN_TYPES, MONTHLY_STATUSES } from "../data/monthlyPlans.js";

const planIds = MONTHLY_PLANS_FLAT.map((plan) => plan.id);
const mealsOptions = MONTHLY_PLANS_FLAT.map((plan) => plan.meals);

const phoneSchema = z
  .string()
  .trim()
  .min(1)
  .transform((value) => String(value).replace(/\D/g, ""))
  .refine((value) => value.length >= 10 && value.length <= 15, {
    message: "Phone number must contain 10 to 15 digits.",
  });

export const monthlyIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const createMonthlySubscriptionSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    phone: phoneSchema,
    address: z.string().trim().min(3).max(300),
    planType: z.enum(MONTHLY_PLAN_TYPES),
    planId: z.string().trim().optional(),
    meals: z.coerce.number().int().positive().refine((value) => mealsOptions.includes(value), {
      message: `Meals must be one of: ${mealsOptions.join(", ")}`,
    }),
  })
  .refine((data) => {
    if (data.planId && !planIds.includes(data.planId)) {
      return false;
    }
    return true;
  }, {
    message: "Unknown plan id.",
    path: ["planId"],
  });

export const listMonthlySubscriptionsSchema = z.object({
  phone: z.string().trim().min(7).max(25).optional(),
  status: z.enum(MONTHLY_STATUSES).optional(),
});

export const redeemMonthlyMealSchema = z.object({
  count: z.coerce.number().int().positive().max(30).default(1),
  meal: z.enum(["Lunch", "Dinner"]).default("Lunch"),
  note: z.string().trim().max(200).default(""),
  redeemedBy: z.string().trim().max(60).default("partner"),
});

export const updateMonthlySubscriptionSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: phoneSchema.optional(),
  address: z.string().trim().min(3).max(300).optional(),
  mealsTotal: z.coerce.number().int().positive().max(240).optional(),
  price: z.coerce.number().nonnegative().optional(),
  status: z.enum(MONTHLY_STATUSES).optional(),
  notes: z.string().trim().max(500).optional(),
});