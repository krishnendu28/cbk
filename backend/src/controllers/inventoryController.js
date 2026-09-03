import {
  createInventoryItem,
  deleteInventoryItem,
  getAllInventoryItems,
  updateInventoryItem,
} from "../services/inventoryService.js";

export async function listInventory(_req, res) {
  try {
    return res.json(getAllInventoryItems());
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch inventory." });
  }
}

export async function addInventoryItem(req, res) {
  try {
    const item = createInventoryItem(req.body);
    return res.status(201).json(item);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to add inventory item." });
  }
}

export async function editInventoryItem(req, res) {
  try {
    const item = updateInventoryItem(req.params.id, req.body);
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found." });
    }
    return res.json(item);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update inventory item." });
  }
}

export async function removeInventoryItem(req, res) {
  try {
    const deleted = deleteInventoryItem(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Inventory item not found." });
    }
    return res.json({ ok: true, id: req.params.id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to delete inventory item." });
  }
}
