import { pgTable, serial, text, integer, timestamp, decimal } from "drizzle-orm/pg-core";
import { outletsTable } from "./outlets";

export const customersTable = pgTable("customers", {
  id: serial("id").primaryKey(),
  outletId: integer("outlet_id").notNull().references(() => outletsTable.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  totalOrders: integer("total_orders").notNull().default(0),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).notNull().default("0.00"),
  lastVisit: timestamp("last_visit"),
  birthdate: text("birthdate"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Customer = typeof customersTable.$inferSelect;
