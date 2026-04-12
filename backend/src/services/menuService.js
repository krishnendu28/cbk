import { randomUUID } from "crypto";
import { getFoodImage } from "../../../frontend/src/data/menuImages.js";
import { createSeededMenuState } from "../data/menuSeed.js";

const seededState = createSeededMenuState();
const memoryMenuCategories = seededState.categories;
let nextMenuItemId = seededState.nextMenuItemId;

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

function findCategoryByIdOrTitle(categoryId, categoryTitle) {
  if (categoryId) {
    const byId = memoryMenuCategories.find((category) => category.id === categoryId);
    if (byId) return byId;
  }
  if (categoryTitle) {
    const byTitle = memoryMenuCategories.find((category) => category.title.toLowerCase() === String(categoryTitle).toLowerCase());
    if (byTitle) return byTitle;
  }
  return null;
}

export function findMenuItemById(itemId) {
  for (const category of memoryMenuCategories) {
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
  return memoryMenuCategories;
}

export function createMenuItem({ categoryId, categoryTitle, name, prices, image, available }) {
  let targetCategory = findCategoryByIdOrTitle(categoryId, categoryTitle);
  if (!targetCategory) {
    targetCategory = {
      id: String(categoryTitle).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || randomUUID(),
      title: String(categoryTitle).trim(),
      items: [],
    };
    memoryMenuCategories.push(targetCategory);
  }

  const nextItem = {
    id: nextMenuItemId++,
    name: String(name).trim(),
    prices: normalizePrices(prices),
    image: String(image || getFoodImage(name, targetCategory.title) || ""),
    available: available !== false,
  };

  targetCategory.items.push(nextItem);
  return { categoryId: targetCategory.id, categoryTitle: targetCategory.title, item: nextItem };
}

export function updateMenuItem(itemId, { name, prices, image, categoryId, categoryTitle, available }) {
  const found = findMenuItemById(itemId);
  if (!found) return null;

  const updatedItem = {
    ...found.item,
    name: String(name || found.item.name).trim(),
    prices: prices ? normalizePrices(prices) : found.item.prices,
    image: image !== undefined ? String(image || "") : String(found.item.image || getFoodImage(name || found.item.name, found.category.title) || ""),
    available: available !== undefined ? Boolean(available) : found.item.available !== false,
  };

  let targetCategory = found.category;
  if (categoryId || categoryTitle) {
    const movedCategory = findCategoryByIdOrTitle(categoryId, categoryTitle);
    if (movedCategory) {
      targetCategory = movedCategory;
    } else if (String(categoryTitle || "").trim()) {
      targetCategory = {
        id: String(categoryTitle).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || randomUUID(),
        title: String(categoryTitle).trim(),
        items: [],
      };
      memoryMenuCategories.push(targetCategory);
    }
  }

  found.category.items.splice(found.index, 1);
  targetCategory.items.push(updatedItem);

  return { categoryId: targetCategory.id, categoryTitle: targetCategory.title, item: updatedItem };
}

export function deleteMenuItem(itemId) {
  const found = findMenuItemById(itemId);
  if (!found) return false;

  found.category.items.splice(found.index, 1);
  return true;
}
