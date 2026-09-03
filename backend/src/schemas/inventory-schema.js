import { z } from "zod";

export const inventoryIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createInventoryItemSchema = z.object({
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  unit: z.string().trim().min(1),
  stock: z.coerce.number().nonnegative().default(0),
  minStock: z.coerce.number().nonnegative().default(0),
  cost: z.coerce.number().nonnegative().default(0),
});

export const updateInventoryItemSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    category: z.string().trim().min(1).optional(),
    unit: z.string().trim().min(1).optional(),
    stock: z.coerce.number().nonnegative().optional(),
    minStock: z.coerce.number().nonnegative().optional(),
    cost: z.coerce.number().nonnegative().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update inventory item",
  });
