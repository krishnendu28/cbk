import { pgTable, serial, text, integer, timestamp, decimal } from "drizzle-orm/pg-core";
import { outletsTable } from "./outlets";

export const inventoryTable = pgTable("inventory", {
  id: serial("id").primaryKey(),
  outletId: integer("outlet_id").notNull().references(() => outletsTable.id),
  name: text("name").notNull(),
  category: text("category").notNull().default("General"),
  unit: text("unit").notNull().default("kg"),
  currentStock: decimal("current_stock", { precision: 10, scale: 3 }).notNull().default("0.000"),
  minStock: decimal("min_stock", { precision: 10, scale: 3 }).notNull().default("0.000"),
  maxStock: decimal("max_stock", { precision: 10, scale: 3 }).notNull().default("100.000"),
  costPerUnit: decimal("cost_per_unit", { precision: 10, scale: 2 }).notNull().default("0.00"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InventoryItem = typeof inventoryTable.$inferSelect;
