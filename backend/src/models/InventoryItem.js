import mongoose from "mongoose";

const inventoryItemSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    stock: { type: Number, min: 0, default: 0 },
    minStock: { type: Number, min: 0, default: 0 },
    cost: { type: Number, min: 0, default: 0 },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

export const InventoryItem = mongoose.model("InventoryItem", inventoryItemSchema);
