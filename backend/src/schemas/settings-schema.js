import { z } from "zod";

export const outletIdParamSchema = z.object({
  outletId: z.coerce.number().int().positive("outletId must be a positive integer"),
});

const nullableTrimmedString = z.union([
  z.string().trim().min(1).max(220),
  z.literal(""),
  z.null(),
]).transform((value) => {
  if (value === null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
});

export const updateOutletSettingsSchema = z.object({
  discountEnabled: z.boolean(),
  discountRate: z.number().min(0).max(100),
  gstEnabled: z.boolean(),
  gstRate: z.number().min(0).max(100),
  serviceChargeEnabled: z.boolean(),
  serviceChargeRate: z.number().min(0).max(100),
  loyaltyPointsPerRupee: z.number().min(0),
  loyaltyRedemptionRate: z.number().min(0),
  currencySymbol: z.string().trim().min(1).max(8),
  receiptFooter: z.string().trim().min(1).max(220),
  printKotAutomatically: z.boolean(),
  zomatoEnabled: z.boolean(),
  swiggyEnabled: z.boolean(),
  zomatoApiKey: nullableTrimmedString.optional().default(null),
  swiggyApiKey: nullableTrimmedString.optional().default(null),
  carbonTrackingEnabled: z.boolean(),
  deliveryCharge: z.number().nonnegative().max(200).optional(),
  etaMinutes: z.number().int().min(15).max(180).optional(),
  orderWindows: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(40),
        start: z.string().trim().regex(/^\d{2}:\d{2}$/),
        end: z.string().trim().regex(/^\d{2}:\d{2}$/),
      }),
    )
    .min(1)
    .optional(),
  firstOrderDiscountEnabled: z.boolean().optional(),
  firstOrderDiscountRate: z.number().min(0).max(100).optional(),
  promoDiscountRate: z.number().min(0).max(100).optional(),
  promoDiscountCode: z.string().trim().max(40).optional(),
  promoActive: z.boolean().optional(),
  promoExpiresAt: z.union([z.string().datetime({ offset: true }), z.null()]).optional(),
});
