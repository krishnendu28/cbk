import { getIO } from "../config/socket.js";
import {
  createMenuItem,
  deleteMenuItem,
  getAllMenuCategories,
  updateMenuItem,
} from "../services/menuService.js";

export function listMenu(_req, res) {
  return res.json(getAllMenuCategories());
}

export function addMenuItem(req, res) {
  try {
    const { categoryTitle, name } = req.body;
    if (!String(name || "").trim()) {
      return res.status(400).json({ message: "Item name is required." });
    }

    if (!String(req.body.categoryId || "").trim() && !String(categoryTitle || "").trim()) {
      return res.status(400).json({ message: "Category is required." });
    }

    const payload = createMenuItem(req.body);
    getIO().emit("menu_created", payload);
    return res.status(201).json(payload);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to add menu item." });
  }
}

export function editMenuItem(req, res) {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isFinite(itemId)) {
      return res.status(400).json({ message: "Invalid menu item id." });
    }

    const payload = updateMenuItem(itemId, req.body);
    if (!payload) {
      return res.status(404).json({ message: "Menu item not found." });
    }

    getIO().emit("menu_updated", payload);
    return res.json(payload);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update menu item." });
  }
}

export function removeMenuItem(req, res) {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isFinite(itemId)) {
      return res.status(400).json({ message: "Invalid menu item id." });
    }

    const deleted = deleteMenuItem(itemId);
    if (!deleted) {
      return res.status(404).json({ message: "Menu item not found." });
    }

    getIO().emit("menu_deleted", { id: itemId });
    return res.json({ ok: true, id: itemId });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to delete menu item." });
  }
}
