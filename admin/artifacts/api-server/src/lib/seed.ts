import { db } from "@workspace/db";
import {
  outletsTable, outletSettingsTable, usersTable, tablesTable,
  categoriesTable, menuItemsTable, inventoryTable, customersTable
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

function hashPassword(pw: string) {
  return crypto.createHash("sha256").update(pw + "tabio_salt").digest("hex");
}

export async function seedIfEmpty() {
  const existing = await db.select().from(outletsTable).limit(1);
  if (existing.length > 0) return;

  // Create outlet
  const [outlet] = await db.insert(outletsTable).values({
    name: "Tabio Demo Restaurant",
    address: "123 Food Street, Mumbai, Maharashtra 400001",
    phone: "+91 98765 43210",
    email: "demo@tabio.com",
    gstNumber: "27AABCU9603R1ZX",
    fssaiNumber: "10012345678",
    currency: "INR",
    timezone: "Asia/Kolkata",
    isActive: true,
  }).returning();

  // Create settings
  await db.insert(outletSettingsTable).values({
    outletId: outlet.id,
    gstEnabled: true,
    gstRate: "5.00",
    serviceChargeEnabled: false,
    serviceChargeRate: "0.00",
    loyaltyPointsPerRupee: "1.00",
    loyaltyRedemptionRate: "0.10",
    currencySymbol: "₹",
    receiptFooter: "Thank you for dining with us! Visit again.",
    printKotAutomatically: true,
    zomatoEnabled: true,
    swiggyEnabled: true,
    carbonTrackingEnabled: true,
  });

  // Create users
  await db.insert(usersTable).values([
    {
      outletId: outlet.id,
      name: "Owner Admin",
      email: "owner@tabio.com",
      password: hashPassword("demo1234"),
      role: "owner",
      phone: "+91 98765 43210",
      isActive: true,
    },
    {
      outletId: outlet.id,
      name: "Manager Raj",
      email: "manager@tabio.com",
      password: hashPassword("demo1234"),
      role: "manager",
      phone: "+91 98765 43211",
      isActive: true,
    },
    {
      outletId: outlet.id,
      name: "Cashier Priya",
      email: "cashier@tabio.com",
      password: hashPassword("demo1234"),
      role: "cashier",
      phone: "+91 98765 43212",
      isActive: true,
    },
    {
      outletId: outlet.id,
      name: "Chef Kumar",
      email: "kitchen@tabio.com",
      password: hashPassword("demo1234"),
      role: "kitchen",
      phone: "+91 98765 43213",
      isActive: true,
    },
  ]);

  // Create tables
  const tableData = [
    { name: "T1", section: "Indoor", capacity: 2, status: "available" },
    { name: "T2", section: "Indoor", capacity: 4, status: "occupied" },
    { name: "T3", section: "Indoor", capacity: 4, status: "available" },
    { name: "T4", section: "Indoor", capacity: 6, status: "reserved" },
    { name: "T5", section: "Indoor", capacity: 2, status: "available" },
    { name: "T6", section: "Indoor", capacity: 4, status: "available" },
    { name: "T7", section: "Outdoor", capacity: 4, status: "available" },
    { name: "T8", section: "Outdoor", capacity: 6, status: "occupied" },
    { name: "T9", section: "Outdoor", capacity: 2, status: "available" },
    { name: "T10", section: "Terrace", capacity: 8, status: "available" },
    { name: "T11", section: "Terrace", capacity: 4, status: "cleaning" },
    { name: "T12", section: "Private", capacity: 10, status: "available" },
  ];
  await db.insert(tablesTable).values(tableData.map(t => ({ ...t, outletId: outlet.id })));

  // Create categories
  const [starters, mains, breads, rice, beverages, desserts, chinese, continental] = await db.insert(categoriesTable).values([
    { outletId: outlet.id, name: "Starters", description: "Appetizers and starters", sortOrder: 1, isActive: true },
    { outletId: outlet.id, name: "Main Course", description: "Main course dishes", sortOrder: 2, isActive: true },
    { outletId: outlet.id, name: "Breads", description: "Fresh breads and rotis", sortOrder: 3, isActive: true },
    { outletId: outlet.id, name: "Rice & Biryani", description: "Fragrant rice dishes", sortOrder: 4, isActive: true },
    { outletId: outlet.id, name: "Beverages", description: "Drinks and beverages", sortOrder: 5, isActive: true },
    { outletId: outlet.id, name: "Desserts", description: "Sweet endings", sortOrder: 6, isActive: true },
    { outletId: outlet.id, name: "Chinese", description: "Indo-Chinese specialties", sortOrder: 7, isActive: true },
    { outletId: outlet.id, name: "Continental", description: "Western cuisine", sortOrder: 8, isActive: true },
  ]).returning();

  // Menu items
  const menuItems = [
    // Starters
    { catId: starters.id, name: "Paneer Tikka", price: "280", type: "veg", prepTime: 15, tax: "5.00", tags: ["bestseller", "spicy"] },
    { catId: starters.id, name: "Chicken Tikka", price: "320", type: "non-veg", prepTime: 20, tax: "5.00", tags: ["bestseller"] },
    { catId: starters.id, name: "Veg Spring Roll", price: "180", type: "veg", prepTime: 12, tax: "5.00", tags: ["crispy"] },
    { catId: starters.id, name: "Fish Fry", price: "380", type: "non-veg", prepTime: 18, tax: "5.00", tags: ["fresh"] },
    { catId: starters.id, name: "Hara Bhara Kabab", price: "220", type: "veg", prepTime: 15, tax: "5.00", tags: [] },
    { catId: starters.id, name: "Reshmi Kebab", price: "360", type: "non-veg", prepTime: 22, tax: "5.00", tags: ["chef special"] },
    // Main Course
    { catId: mains.id, name: "Butter Chicken", price: "380", type: "non-veg", prepTime: 20, tax: "5.00", tags: ["bestseller"] },
    { catId: mains.id, name: "Palak Paneer", price: "280", type: "veg", prepTime: 18, tax: "5.00", tags: ["healthy"] },
    { catId: mains.id, name: "Dal Makhani", price: "240", type: "veg", prepTime: 15, tax: "5.00", tags: ["slow cooked"] },
    { catId: mains.id, name: "Mutton Rogan Josh", price: "480", type: "non-veg", prepTime: 30, tax: "5.00", tags: ["chef special"] },
    { catId: mains.id, name: "Kadai Paneer", price: "300", type: "veg", prepTime: 18, tax: "5.00", tags: ["spicy"] },
    { catId: mains.id, name: "Chicken Korma", price: "360", type: "non-veg", prepTime: 22, tax: "5.00", tags: ["mild"] },
    // Breads
    { catId: breads.id, name: "Butter Naan", price: "60", type: "veg", prepTime: 8, tax: "5.00", tags: [] },
    { catId: breads.id, name: "Garlic Naan", price: "80", type: "veg", prepTime: 8, tax: "5.00", tags: ["popular"] },
    { catId: breads.id, name: "Tandoori Roti", price: "40", type: "veg", prepTime: 6, tax: "5.00", tags: [] },
    { catId: breads.id, name: "Laccha Paratha", price: "70", type: "veg", prepTime: 8, tax: "5.00", tags: [] },
    // Rice
    { catId: rice.id, name: "Chicken Biryani", price: "360", type: "non-veg", prepTime: 25, tax: "5.00", tags: ["bestseller"] },
    { catId: rice.id, name: "Veg Biryani", price: "280", type: "veg", prepTime: 22, tax: "5.00", tags: ["fragrant"] },
    { catId: rice.id, name: "Mutton Biryani", price: "440", type: "non-veg", prepTime: 30, tax: "5.00", tags: ["slow cooked"] },
    { catId: rice.id, name: "Steamed Rice", price: "80", type: "veg", prepTime: 10, tax: "5.00", tags: [] },
    // Beverages
    { catId: beverages.id, name: "Mango Lassi", price: "120", type: "veg", prepTime: 5, tax: "12.00", tags: ["refreshing"] },
    { catId: beverages.id, name: "Masala Chai", price: "60", type: "veg", prepTime: 5, tax: "12.00", tags: [] },
    { catId: beverages.id, name: "Cold Coffee", price: "160", type: "veg", prepTime: 5, tax: "12.00", tags: ["popular"] },
    { catId: beverages.id, name: "Fresh Lime Soda", price: "80", type: "veg", prepTime: 3, tax: "12.00", tags: [] },
    { catId: beverages.id, name: "Virgin Mojito", price: "180", type: "veg", prepTime: 5, tax: "12.00", tags: ["mocktail"] },
    // Desserts
    { catId: desserts.id, name: "Gulab Jamun", price: "120", type: "veg", prepTime: 5, tax: "5.00", tags: ["sweet"] },
    { catId: desserts.id, name: "Rasgulla", price: "100", type: "veg", prepTime: 5, tax: "5.00", tags: [] },
    { catId: desserts.id, name: "Chocolate Brownie", price: "180", type: "veg", prepTime: 8, tax: "5.00", tags: ["popular"] },
    // Chinese
    { catId: chinese.id, name: "Veg Fried Rice", price: "220", type: "veg", prepTime: 12, tax: "5.00", tags: [] },
    { catId: chinese.id, name: "Chicken Manchurian", price: "320", type: "non-veg", prepTime: 15, tax: "5.00", tags: ["spicy"] },
    { catId: chinese.id, name: "Hakka Noodles", price: "240", type: "veg", prepTime: 12, tax: "5.00", tags: [] },
    // Continental
    { catId: continental.id, name: "Grilled Fish", price: "480", type: "non-veg", prepTime: 20, tax: "5.00", tags: ["healthy"] },
    { catId: continental.id, name: "Pasta Arrabiata", price: "320", type: "veg", prepTime: 18, tax: "5.00", tags: ["spicy"] },
  ];

  for (const item of menuItems) {
    await db.insert(menuItemsTable).values({
      outletId: outlet.id,
      categoryId: item.catId,
      name: item.name,
      basePrice: item.price,
      foodType: item.type,
      isAvailable: true,
      preparationTime: item.prepTime,
      taxRate: item.tax,
      tags: item.tags,
      variants: item.name === "Butter Chicken" ? [
        { id: 1, name: "Half Plate", price: 280, isDefault: false },
        { id: 2, name: "Full Plate", price: 380, isDefault: true },
      ] : item.name === "Paneer Tikka" ? [
        { id: 1, name: "Regular", price: 280, isDefault: true },
        { id: 2, name: "Large", price: 420, isDefault: false },
      ] : [],
      addons: item.name === "Butter Chicken" || item.name === "Palak Paneer" ? [
        { id: 1, name: "Extra Gravy", price: 40, isRequired: false },
      ] : item.catId === breads.id ? [
        { id: 1, name: "Butter", price: 20, isRequired: false },
      ] : [],
      sortOrder: 0,
    });
  }

  // Inventory
  await db.insert(inventoryTable).values([
    { outletId: outlet.id, name: "Chicken", category: "Meat", unit: "kg", currentStock: "15.000", minStock: "5.000", maxStock: "50.000", costPerUnit: "280.00" },
    { outletId: outlet.id, name: "Paneer", category: "Dairy", unit: "kg", currentStock: "8.000", minStock: "3.000", maxStock: "20.000", costPerUnit: "380.00" },
    { outletId: outlet.id, name: "Rice (Basmati)", category: "Grains", unit: "kg", currentStock: "2.000", minStock: "5.000", maxStock: "30.000", costPerUnit: "120.00" },
    { outletId: outlet.id, name: "Onion", category: "Vegetables", unit: "kg", currentStock: "10.000", minStock: "5.000", maxStock: "25.000", costPerUnit: "30.00" },
    { outletId: outlet.id, name: "Tomato", category: "Vegetables", unit: "kg", currentStock: "8.000", minStock: "5.000", maxStock: "20.000", costPerUnit: "40.00" },
    { outletId: outlet.id, name: "Cooking Oil", category: "Oil", unit: "L", currentStock: "5.000", minStock: "3.000", maxStock: "15.000", costPerUnit: "130.00" },
    { outletId: outlet.id, name: "Butter", category: "Dairy", unit: "kg", currentStock: "3.000", minStock: "2.000", maxStock: "10.000", costPerUnit: "480.00" },
    { outletId: outlet.id, name: "Flour (Maida)", category: "Grains", unit: "kg", currentStock: "1.500", minStock: "5.000", maxStock: "20.000", costPerUnit: "45.00" },
    { outletId: outlet.id, name: "Mutton", category: "Meat", unit: "kg", currentStock: "6.000", minStock: "3.000", maxStock: "15.000", costPerUnit: "750.00" },
    { outletId: outlet.id, name: "Cream", category: "Dairy", unit: "L", currentStock: "2.000", minStock: "1.000", maxStock: "8.000", costPerUnit: "320.00" },
    { outletId: outlet.id, name: "Green Chilli", category: "Vegetables", unit: "kg", currentStock: "1.000", minStock: "0.500", maxStock: "3.000", costPerUnit: "60.00" },
    { outletId: outlet.id, name: "Gas Cylinder", category: "Utilities", unit: "units", currentStock: "0.500", minStock: "1.000", maxStock: "5.000", costPerUnit: "900.00" },
  ]);

  // Customers
  await db.insert(customersTable).values([
    { outletId: outlet.id, name: "Rahul Sharma", phone: "+91 98100 11111", email: "rahul@example.com", loyaltyPoints: 450, totalOrders: 12, totalSpent: "4500.00" },
    { outletId: outlet.id, name: "Priya Patel", phone: "+91 98100 22222", email: "priya@example.com", loyaltyPoints: 1200, totalOrders: 28, totalSpent: "12000.00" },
    { outletId: outlet.id, name: "Amit Kumar", phone: "+91 98100 33333", email: null, loyaltyPoints: 80, totalOrders: 3, totalSpent: "800.00" },
    { outletId: outlet.id, name: "Sonia Mehta", phone: "+91 98100 44444", email: "sonia@example.com", loyaltyPoints: 2100, totalOrders: 45, totalSpent: "21000.00" },
    { outletId: outlet.id, name: "Vikram Singh", phone: "+91 98100 55555", email: null, loyaltyPoints: 320, totalOrders: 8, totalSpent: "3200.00" },
    { outletId: outlet.id, name: "Anjali Gupta", phone: "+91 98100 66666", email: "anjali@example.com", loyaltyPoints: 750, totalOrders: 18, totalSpent: "7500.00" },
  ]);

  console.log("Seed data inserted successfully for outlet id:", outlet.id);
}
