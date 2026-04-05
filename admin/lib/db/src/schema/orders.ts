import { pgTable, serial, text, integer, boolean, timestamp, decimal, json } from "drizzle-orm/pg-core";
import { outletsTable } from "./outlets";
import { tablesTable } from "./tables";
import { usersTable } from "./users";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  outletId: integer("outlet_id").notNull().references(() => outletsTable.id),
  orderNumber: text("order_number").notNull(),
  type: text("type").notNull().default("dine-in"),
  status: text("status").notNull().default("pending"),
  tableId: integer("table_id").references(() => tablesTable.id),
  customerId: integer("customer_id"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  items: json("items").notNull().default([]),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0.00"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  discountType: text("discount_type"),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  paymentMethod: text("payment_method"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  notes: text("notes"),
  aggregatorOrderId: text("aggregator_order_id"),
  aggregatorPlatform: text("aggregator_platform"),
  staffId: integer("staff_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const kotsTable = pgTable("kots", {
  id: serial("id").primaryKey(),
  outletId: integer("outlet_id").notNull().references(() => outletsTable.id),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  kotNumber: text("kot_number").notNull(),
  station: text("station").notNull().default("kitchen"),
  status: text("status").notNull().default("pending"),
  items: json("items").notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const billsTable = pgTable("bills", {
  id: serial("id").primaryKey(),
  outletId: integer("outlet_id").notNull().references(() => outletsTable.id),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  billNumber: text("bill_number").notNull(),
  items: json("items").notNull().default([]),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  splitPayments: json("split_payments"),
  loyaltyPointsEarned: integer("loyalty_points_earned").notNull().default(0),
  loyaltyPointsRedeemed: integer("loyalty_points_redeemed").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Order = typeof ordersTable.$inferSelect;
export type KOT = typeof kotsTable.$inferSelect;
export type Bill = typeof billsTable.$inferSelect;
