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
    const itemId = req.params.id;

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
    const itemId = req.params.id;

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
