import { randomUUID } from "crypto";
import { menuCategories as seedMenuCategories } from "../data/vendor/menuData.js";
import { getFoodImage } from "../data/vendor/getFoodImage.js";
import { derivePortions } from "../utils/portions.js";

export function createSeededMenuState() {
  let nextMenuItemId = 1;

  const categories = (Array.isArray(seedMenuCategories) ? seedMenuCategories : []).map((category) => ({
    id: String(category.id || randomUUID()),
    title: String(category.title || "Menu"),
    items: (Array.isArray(category.items) ? category.items : []).map((item) => {
      const prices = item.prices && typeof item.prices === "object" ? item.prices : { Regular: Number(item.price) || 0 };
      return {
        id: nextMenuItemId++,
        name: String(item.name || "Item"),
        description: String(item.description || ""),
        prices,
        portions: derivePortions(item.name, prices, category.title),
        image: String(item.image || getFoodImage(item.name, category.title) || ""),
        available: item.available !== false,
      };
    }),
  }));

  return {
    categories,
    nextMenuItemId,
  };
}
