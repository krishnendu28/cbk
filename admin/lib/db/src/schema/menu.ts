import { pgTable, serial, text, integer, boolean, timestamp, decimal, json } from "drizzle-orm/pg-core";
import { outletsTable } from "./outlets";

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  outletId: integer("outlet_id").notNull().references(() => outletsTable.id),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const menuItemsTable = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  outletId: integer("outlet_id").notNull().references(() => outletsTable.id),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id),
  name: text("name").notNull(),
  description: text("description"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  foodType: text("food_type").notNull().default("veg"),
  isAvailable: boolean("is_available").notNull().default(true),
  imageUrl: text("image_url"),
  variants: json("variants").notNull().default([]),
  addons: json("addons").notNull().default([]),
  tags: json("tags").notNull().default([]),
  preparationTime: integer("preparation_time").notNull().default(15),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull().default("18.00"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Category = typeof categoriesTable.$inferSelect;
export type MenuItem = typeof menuItemsTable.$inferSelect;
