import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    prices: { type: mongoose.Schema.Types.Mixed, default: {} },
    image: { type: String, default: "" },
    available: { type: Boolean, default: true },
  },
  { _id: false },
);

const menuCategorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    items: { type: [menuItemSchema], default: [] },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

export const MenuCategory = mongoose.model("MenuCategory", menuCategorySchema);
