import { menuCategories as seedMenuCategories } from "../../../frontend/src/data/menuData.js";
import { getFoodImage } from "../../../frontend/src/data/menuImages.js";
import { randomUUID } from "crypto";

export function createSeededMenuState() {
  let nextMenuItemId = 1;

  const categories = (Array.isArray(seedMenuCategories) ? seedMenuCategories : []).map((category) => ({
    id: String(category.id || randomUUID()),
    title: String(category.title || "Menu"),
    items: (Array.isArray(category.items) ? category.items : []).map((item) => ({
      id: nextMenuItemId++,
      name: String(item.name || "Item"),
      prices: item.prices && typeof item.prices === "object" ? item.prices : { Regular: Number(item.price) || 0 },
      image: String(item.image || getFoodImage(item.name, category.title) || ""),
    })),
  }));

  return {
    categories,
    nextMenuItemId,
  };
}
