import {
  createMenuItem,
  deleteMenuItem,
  ensureMenuFresh,
  getAllMenuCategories,
  resetMenuToDefaults,
  updateMenuItem,
} from "../services/menuService.js";
import { uploadMenuImage } from "../services/imageUploadService.js";

export async function listMenu(_req, res) {
  try {
    await ensureMenuFresh();
  } catch {
    // fall back to whatever is cached
  }
  return res.json(getAllMenuCategories());
}

export async function uploadMenuImageController(req, res) {
  try {
    const result = await uploadMenuImage({
      image: req.body?.image,
      fileName: req.body?.fileName,
    });
    if (result.error) {
      return res.status(400).json({ message: result.error });
    }
    return res.json({ url: result.url });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to upload image." });
  }
}

export async function resetMenu(_req, res) {
  try {
    const categories = await resetMenuToDefaults();
    const totalItems = categories.reduce((sum, category) => sum + (category.items?.length || 0), 0);
    return res.json({ ok: true, categories: categories.length, items: totalItems });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to reset menu." });
  }
}

export async function addMenuItem(req, res) {
  try {
    const payload = await createMenuItem(req.body);
    return res.status(201).json(payload);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to add menu item." });
  }
}

export async function editMenuItem(req, res) {
  try {
    const itemId = req.params.id;

    const payload = await updateMenuItem(itemId, req.body);
    if (!payload) {
      return res.status(404).json({ message: "Menu item not found." });
    }

    return res.json(payload);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update menu item." });
  }
}

export async function removeMenuItem(req, res) {
  try {
    const itemId = req.params.id;

    const deleted = await deleteMenuItem(itemId);
    if (!deleted) {
      return res.status(404).json({ message: "Menu item not found." });
    }

    return res.json({ ok: true, id: itemId });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to delete menu item." });
  }
}
