import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { outletsTable } from "./outlets";

export const tablesTable = pgTable("tables", {
  id: serial("id").primaryKey(),
  outletId: integer("outlet_id").notNull().references(() => outletsTable.id),
  name: text("name").notNull(),
  capacity: integer("capacity").notNull().default(4),
  section: text("section").notNull().default("Main"),
  status: text("status").notNull().default("available"),
  currentOrderId: integer("current_order_id"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Table = typeof tablesTable.$inferSelect;
