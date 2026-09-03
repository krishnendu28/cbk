import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { InventoryItem } from "../models/InventoryItem.js";
import { logger } from "../utils/logger.js";

const DEFAULT_INVENTORY = [
  { id: 1, name: "Basmati Rice", category: "Grains", unit: "kg", stock: 28, minStock: 8, cost: 95 },
  { id: 2, name: "Chicken", category: "Meat", unit: "kg", stock: 16, minStock: 6, cost: 220 },
  { id: 3, name: "Paneer", category: "Dairy", unit: "kg", stock: 11, minStock: 4, cost: 300 },
  { id: 4, name: "Cooking Oil", category: "Essentials", unit: "ltr", stock: 18, minStock: 5, cost: 130 },
  { id: 5, name: "Spice Mix", category: "Spices", unit: "kg", stock: 7, minStock: 3, cost: 420 },
  { id: 6, name: "Mushroom", category: "Veggies", unit: "kg", stock: 9, minStock: 3, cost: 180 },
];

const cache = {
  items: [],
  nextId: 1,
};

let loadPromise = null;
let persistChain = Promise.resolve();

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

function toPlain(doc) {
  return {
    id: doc.id,
    name: doc.name,
    category: doc.category,
    unit: doc.unit,
    stock: Number(doc.stock) || 0,
    minStock: Number(doc.minStock) || 0,
    cost: Number(doc.cost) || 0,
  };
}

function seedDefaults() {
  cache.items = DEFAULT_INVENTORY.map((item) => ({ ...item }));
  cache.nextId = Math.max(0, ...cache.items.map((item) => item.id)) + 1;
  return cache.items;
}

export async function loadInventoryFromDb() {
  if (!isMongoConnected()) {
    seedDefaults();
    return cache.items;
  }

  const docs = await InventoryItem.find().lean().sort({ id: 1 });
  if (docs.length === 0) {
    seedDefaults();
    await InventoryItem.insertMany(
      DEFAULT_INVENTORY.map((item) => ({ ...item })),
      { ordered: true },
    );
    return cache.items;
  }

  cache.items = docs.map((doc) => toPlain(doc));
  cache.nextId = Math.max(0, ...cache.items.map((item) => item.id)) + 1;
  return cache.items;
}

export async function ensureInventoryLoaded() {
  if (!loadPromise) {
    loadPromise = loadInventoryFromDb().catch((error) => {
      logger.warn("inventory.load_failed", { reason: error?.message || String(error) });
      seedDefaults();
      loadPromise = null;
    });
  }
  await loadPromise;
}

export async function flushInventoryPersistence() {
  await persistChain;
}

export function getAllInventoryItems() {
  if (cache.items.length === 0 && isMongoConnected()) {
    loadPromise = loadPromise || loadInventoryFromDb();
  }
  if (cache.items.length === 0) {
    seedDefaults();
  }
  return cache.items.map((item) => ({ ...item }));
}

export function findInventoryItem(id) {
  const numericId = Number(id);
  return cache.items.find((item) => Number(item.id) === numericId) || null;
}

function persistItem(item) {
  if (!isMongoConnected()) return Promise.resolve();

  const write = InventoryItem.findOneAndReplace(
    { id: Number(item.id) },
    {
      id: Number(item.id),
      name: String(item.name).trim(),
      category: String(item.category).trim(),
      unit: String(item.unit).trim(),
      stock: Math.max(0, Number(item.stock) || 0),
      minStock: Math.max(0, Number(item.minStock) || 0),
      cost: Math.max(0, Number(item.cost) || 0),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  persistChain = persistChain
    .then(() => write)
    .catch((error) => {
      logger.error("inventory.persist_failed", { reason: error?.message || String(error) });
    });

  return persistChain;
}

export function createInventoryItem({ name, category, unit, stock, minStock, cost }) {
  const item = {
    id: cache.nextId++,
    name: String(name).trim(),
    category: String(category).trim(),
    unit: String(unit).trim(),
    stock: Math.max(0, Number(stock) || 0),
    minStock: Math.max(0, Number(minStock) || 0),
    cost: Math.max(0, Number(cost) || 0),
  };
  cache.items = [item, ...cache.items];
  persistItem(item);
  return { ...item };
}

export function updateInventoryItem(id, patch = {}) {
  const current = findInventoryItem(id);
  if (!current) return null;

  const updated = {
    ...current,
    name: patch.name !== undefined ? String(patch.name).trim() : current.name,
    category: patch.category !== undefined ? String(patch.category).trim() : current.category,
    unit: patch.unit !== undefined ? String(patch.unit).trim() : current.unit,
    stock: patch.stock !== undefined ? Math.max(0, Number(patch.stock) || 0) : current.stock,
    minStock: patch.minStock !== undefined ? Math.max(0, Number(patch.minStock) || 0) : current.minStock,
    cost: patch.cost !== undefined ? Math.max(0, Number(patch.cost) || 0) : current.cost,
  };

  cache.items = cache.items.map((item) => (Number(item.id) === Number(id) ? updated : item));
  persistItem(updated);
  return { ...updated };
}

export function deleteInventoryItem(id) {
  const index = cache.items.findIndex((item) => Number(item.id) === Number(id));
  if (index < 0) return false;

  const [removed] = cache.items.splice(index, 1);
  if (isMongoConnected()) {
    persistChain = persistChain
      .then(() => InventoryItem.findOneAndDelete({ id: Number(id) }).lean())
      .catch((error) => {
        logger.error("inventory.delete_failed", { reason: error?.message || String(error) });
      });
  }
  return Boolean(removed);
}

// Best-effort: subtract quantities for any inventory item whose name is referenced.
// This is intentionally non-blocking so a misconfigured / missing mapping never
// fails an order. Extend mapping here as ingredients are tagged on menu items.
const INGREDIENT_USAGE_HINTS = {
  biryani: ["Basmati Rice", "Spice Mix"],
  rice: ["Basmati Rice"],
  "fried rice": ["Basmati Rice"],
  "paneer": ["Paneer"],
  "chicken": ["Chicken"],
  "mutton": ["Chicken"],
  "mushroom": ["Mushroom"],
  "curry": ["Spice Mix"],
};

const VARIANT_BASE_GRAM_TO_KG = {
  Half: 0.25,
  Full: 0.5,
  Regular: 0.25,
};

export function decrementInventoryForOrder(items = []) {
  const consumed = new Map();

  for (const item of items) {
    const name = String(item?.name || "").toLowerCase();
    const variant = String(item?.variant || "Regular");
    const qty = Number(item?.quantity) || 1;

    let keysHinted = false;
    for (const [keyword, names] of Object.entries(INGREDIENT_USAGE_HINTS)) {
      if (name.includes(keyword)) {
        for (const ingredientName of names) {
          const weight = VARIANT_BASE_GRAM_TO_KG[variant] || 0.25;
          consumed.set(ingredientName, (consumed.get(ingredientName) || 0) + qty * weight);
        }
        keysHinted = true;
        break;
      }
    }
    if (!keysHinted) {
      const weight = VARIANT_BASE_GRAM_TO_KG[variant] || 0.25;
      consumed.set(item.name, (consumed.get(item.name) || 0) + qty * weight);
    }
  }

  const changes = [];
  for (const [ingredientName, amount] of consumed) {
    const current = cache.items.find(
      (inv) => String(inv.name).trim().toLowerCase() === String(ingredientName).trim().toLowerCase(),
    );
    if (current && current.stock >= 0) {
      const updated = {
        ...current,
        stock: Math.max(0, Math.round((current.stock - amount) * 100) / 100),
      };
      cache.items = cache.items.map((item) => (Number(item.id) === Number(current.id) ? updated : item));
      persistItem(updated);
      changes.push({ id: current.id, name: current.name, stock: updated.stock });
    }
  }

  return changes;
}
