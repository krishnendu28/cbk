import { z } from "zod";

const pricesSchema = z
  .record(z.string().min(1), z.coerce.number().nonnegative())
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one price variant is required.",
  });

const portionsSchema = z.record(z.string().min(1), z.string().trim().min(1).max(60));

export const menuIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createMenuItemSchema = z
  .object({
    categoryId: z.string().trim().min(1).optional(),
    categoryTitle: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1),
    description: z.string().trim().max(500).optional(),
    prices: pricesSchema,
    portions: portionsSchema.optional(),
    image: z.string().trim().url().optional(),
    available: z.boolean().optional(),
  })
  .refine((data) => data.categoryId || data.categoryTitle, {
    message: "categoryId or categoryTitle is required",
    path: ["categoryTitle"],
  });

export const updateMenuItemSchema = z
  .object({
    categoryId: z.string().trim().min(1).optional(),
    categoryTitle: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().max(500).optional(),
    prices: pricesSchema.optional(),
    portions: portionsSchema.optional(),
    image: z.string().trim().url().optional(),
    available: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update menu item",
  });
