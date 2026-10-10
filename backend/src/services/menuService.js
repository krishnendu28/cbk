import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { MenuCategory } from "../models/Menu.js";
import { getFoodImage } from "../data/vendor/menuImages.js";
import { createSeededMenuState } from "../data/seedMenuState.js";
import { derivePortions, normalizePortions } from "../utils/portions.js";
import { logger } from "../utils/logger.js";

const menuCache = {
  categories: [],
  nextMenuItemId: 1,
};

let loadPromise = null;
let persistChain = Promise.resolve();
let lastLoadedAt = 0;
const MENU_CACHE_TTL_MS = 5000;

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

function normalizePrices(input) {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const entries = Object.entries(input)
      .map(([variant, value]) => [String(variant || "Regular"), Number(value) || 0])
      .filter(([, value]) => Number.isFinite(value));
    if (entries.length > 0) {
      return Object.fromEntries(entries);
    }
  }
  return { Regular: 0 };
}

function toPlain(category) {
  return {
    id: category.id,
    title: category.title,
    items: (category.items || []).map((item) => {
      const derived = derivePortions(item.name, item.prices, category.title);
      const portions = { ...derived, ...normalizePortions(item.portions) };
      return {
        id: item.id,
        name: item.name,
        description: item.description || "",
        contents: item.contents || "",
        prices: item.prices || {},
        portions,
        image: item.image || "",
        available: item.available !== false,
      };
    }),
  };
}

function findCategoryByIdOrTitle(categoryId, categoryTitle) {
  if (categoryId) {
    const byId = menuCache.categories.find((category) => category.id === categoryId);
    if (byId) return byId;
  }
  if (categoryTitle) {
    const byTitle = menuCache.categories.find(
      (category) => category.title.toLowerCase() === String(categoryTitle).toLowerCase(),
    );
    if (byTitle) return byTitle;
  }
  return null;
}

function ensureLoadedSync() {
  if (menuCache.categories.length === 0 && isMongoConnected()) {
    loadPromise = loadPromise || loadMenuStateFromDb();
  }
}

export async function loadMenuStateFromDb() {
  lastLoadedAt = Date.now();
  if (!isMongoConnected()) {
    const seeded = createSeededMenuState();
    menuCache.categories = seeded.categories;
    menuCache.nextMenuItemId = seeded.nextMenuItemId;
    return menuCache.categories;
  }

  const docs = await MenuCategory.find().lean();
  if (docs.length === 0) {
    const seeded = createSeededMenuState();
    await MenuCategory.insertMany(seeded.categories);
    menuCache.categories = seeded.categories;
    menuCache.nextMenuItemId = seeded.nextMenuItemId;
    return menuCache.categories;
  }

  menuCache.categories = docs
    .map((doc) => toPlain(doc))
    .sort((a, b) => String(a.title).localeCompare(String(b.title)));

  let maxItemId = 0;
  menuCache.categories.forEach((category) => {
    category.items.forEach((item) => {
      if (typeof item.id === "number" && item.id > maxItemId) {
        maxItemId = item.id;
      }
    });
  });
  menuCache.nextMenuItemId = maxItemId + 1;

  return menuCache.categories;
}

export async function ensureMenuLoaded() {
  if (!loadPromise) {
    loadPromise = loadMenuStateFromDb().catch((error) => {
      logger.warn("menu.load_failed", { reason: error?.message || String(error) });
      const seeded = createSeededMenuState();
      menuCache.categories = seeded.categories;
      menuCache.nextMenuItemId = seeded.nextMenuItemId;
      loadPromise = null;
    });
  }
  await loadPromise;
}

// Serverless containers keep their in-memory cache for the container's whole
// lifetime, so edits made on one container were invisible to reads served by
// another warm container. Reload from Mongo when the cache is stale.
export async function ensureMenuFresh() {
  const stale = menuCache.categories.length === 0 || Date.now() - lastLoadedAt >= MENU_CACHE_TTL_MS;
  if (!stale) return menuCache.categories;

  try {
    loadPromise = loadMenuStateFromDb();
    await loadPromise;
  } catch (error) {
    logger.warn("menu.refresh_failed", { reason: error?.message || String(error) });
    loadPromise = null;
  }

  return menuCache.categories;
}

export async function flushMenuPersistence() {
  await persistChain;
}

export function findMenuItemById(itemId) {
  ensureLoadedSync();
  for (const category of menuCache.categories) {
    const index = category.items.findIndex((item) => item.id === itemId);
    if (index >= 0) {
      return {
        category,
        index,
        item: category.items[index],
      };
    }
  }
  return null;
}

export function isMenuItemAvailable(itemId) {
  const found = findMenuItemById(Number(itemId));
  return Boolean(found && found.item.available !== false);
}

export function getAllMenuCategories() {
  ensureLoadedSync();
  return menuCache.categories;
}

export async function resetMenuToDefaults() {
  const seeded = createSeededMenuState();
  if (isMongoConnected()) {
    try {
      await MenuCategory.deleteMany({});
      await MenuCategory.insertMany(seeded.categories);
    } catch (error) {
      logger.warn("menu.reset_persist_failed", { reason: error?.message || String(error) });
    }
  }
  menuCache.categories = seeded.categories;
  menuCache.nextMenuItemId = seeded.nextMenuItemId;
  lastLoadedAt = Date.now();
  return menuCache.categories;
}

function persistCategories() {
  if (!isMongoConnected()) return Promise.resolve();

  const snapshot = menuCache.categories.map((category) => ({
    id: category.id,
    title: category.title,
    items: category.items.map((item) => ({ ...item })),
  }));

  const write = Promise.all(
    snapshot.map((category) =>
      MenuCategory.findOneAndReplace(
        { id: category.id },
        {
          id: category.id,
          title: category.title,
          items: category.items,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean(),
    ),
  );

  persistChain = persistChain
    .then(() => write)
    .catch((error) => {
      logger.error("menu.persist_failed", { reason: error?.message || String(error) });
    });

  return persistChain;
}

export async function createMenuItem({ categoryId, categoryTitle, name, description, contents, prices, portions, image, available }) {
  ensureLoadedSync();
  let targetCategory = findCategoryByIdOrTitle(categoryId, categoryTitle);
  if (!targetCategory) {
    targetCategory = {
      id:
        String(categoryTitle)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || randomUUID(),
      title: String(categoryTitle).trim(),
      items: [],
    };
    menuCache.categories.push(targetCategory);
  }

  const normalizedPrices = normalizePrices(prices);
  const nextItem = {
    id: menuCache.nextMenuItemId++,
    name: String(name).trim(),
    description: String(description || "").trim(),
    contents: String(contents || "").trim(),
    prices: normalizedPrices,
    portions: normalizePortions(portions),
    image: String(image || getFoodImage(name, targetCategory.title) || ""),
    available: available !== false,
  };

  targetCategory.items.push(nextItem);
  const payload = { categoryId: targetCategory.id, categoryTitle: targetCategory.title, item: nextItem };
  await persistCategories();
  return payload;
}

export async function updateMenuItem(itemId, { name, description, contents, prices, portions, image, categoryId, categoryTitle, available }) {
  ensureLoadedSync();
  const found = findMenuItemById(Number(itemId));
  if (!found) return null;

  const updatedItem = {
    ...found.item,
    name: String(name || found.item.name).trim(),
    description:
      description !== undefined
        ? String(description || "").trim()
        : String(found.item.description || ""),
    contents:
      contents !== undefined
        ? String(contents || "").trim()
        : String(found.item.contents || ""),
    prices: prices ? normalizePrices(prices) : found.item.prices,
    portions: portions !== undefined ? normalizePortions(portions) : found.item.portions || {},
    image:
      image !== undefined
        ? String(image || "")
        : String(found.item.image || getFoodImage(name || found.item.name, found.category.title) || ""),
    available: available !== undefined ? Boolean(available) : found.item.available !== false,
  };

  let targetCategory = found.category;
  if (categoryId || categoryTitle) {
    const movedCategory = findCategoryByIdOrTitle(categoryId, categoryTitle);
    if (movedCategory) {
      targetCategory = movedCategory;
    } else if (String(categoryTitle || "").trim()) {
      targetCategory = {
        id:
          String(categoryTitle)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") || randomUUID(),
        title: String(categoryTitle).trim(),
        items: [],
      };
      menuCache.categories.push(targetCategory);
    }
  }

  found.category.items.splice(found.index, 1);
  targetCategory.items.push(updatedItem);

  const payload = { categoryId: targetCategory.id, categoryTitle: targetCategory.title, item: updatedItem };
  await persistCategories();
  return payload;
}

export async function deleteMenuItem(itemId) {
  ensureLoadedSync();
  const found = findMenuItemById(Number(itemId));
  if (!found) return false;

  found.category.items.splice(found.index, 1);
  await persistCategories();
  return true;
}
