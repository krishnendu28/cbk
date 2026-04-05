import { pgTable, serial, text, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const outletsTable = pgTable("outlets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  gstNumber: text("gst_number").notNull().default(""),
  fssaiNumber: text("fssai_number").notNull().default(""),
  currency: text("currency").notNull().default("INR"),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  logoUrl: text("logo_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const outletSettingsTable = pgTable("outlet_settings", {
  id: serial("id").primaryKey(),
  outletId: serial("outlet_id").notNull().references(() => outletsTable.id),
  gstEnabled: boolean("gst_enabled").notNull().default(true),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).notNull().default("18.00"),
  serviceChargeEnabled: boolean("service_charge_enabled").notNull().default(false),
  serviceChargeRate: decimal("service_charge_rate", { precision: 5, scale: 2 }).notNull().default("0.00"),
  loyaltyPointsPerRupee: decimal("loyalty_points_per_rupee", { precision: 5, scale: 2 }).notNull().default("1.00"),
  loyaltyRedemptionRate: decimal("loyalty_redemption_rate", { precision: 5, scale: 2 }).notNull().default("0.10"),
  currencySymbol: text("currency_symbol").notNull().default("₹"),
  receiptFooter: text("receipt_footer").notNull().default("Thank you for dining with us!"),
  printKotAutomatically: boolean("print_kot_automatically").notNull().default(true),
  zomatoEnabled: boolean("zomato_enabled").notNull().default(false),
  swiggyEnabled: boolean("swiggy_enabled").notNull().default(false),
  zomatoApiKey: text("zomato_api_key"),
  swiggyApiKey: text("swiggy_api_key"),
  carbonTrackingEnabled: boolean("carbon_tracking_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOutletSchema = createInsertSchema(outletsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOutlet = z.infer<typeof insertOutletSchema>;
export type Outlet = typeof outletsTable.$inferSelect;
export type OutletSettings = typeof outletSettingsTable.$inferSelect;
