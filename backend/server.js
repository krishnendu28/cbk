import dotenv from "dotenv";
import express from "express";
import http from "http";
import cors from "cors";
import mongoose from "mongoose";
import { Server as SocketIOServer } from "socket.io";
import { randomUUID } from "crypto";
import { menuCategories as seedMenuCategories } from "../frontend/src/data/menuData.js";
import { getFoodImage } from "../frontend/src/data/menuImages.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.set("trust proxy", 1);

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
];

const envAllowedOrigins = String(process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envAllowedOrigins])];
const allowRenderPreviewOrigins = String(process.env.ALLOW_RENDER_PREVIEWS || "true").toLowerCase() === "true";

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (allowRenderPreviewOrigins && /^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(origin)) return true;
  return /^http:\/\/localhost:\d+$/.test(origin);
}

const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by Socket.IO CORS"));
    },
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PATCH", "DELETE"],
  }),
);
app.use(express.json());

const orderItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    variant: { type: String, default: "Regular" },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    items: { type: [orderItemSchema], required: true },
    total: { type: Number, required: true, min: 0 },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["Preparing", "Ready", "Delivered"],
      default: "Preparing",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

const Order = mongoose.model("Order", orderSchema);
const memoryOrders = [];
let useMongo = false;

let nextMenuItemId = 1;
const memoryMenuCategories = (Array.isArray(seedMenuCategories) ? seedMenuCategories : []).map((category) => ({
  id: String(category.id || randomUUID()),
  title: String(category.title || "Menu"),
  items: (Array.isArray(category.items) ? category.items : []).map((item) => ({
    id: nextMenuItemId++,
    name: String(item.name || "Item"),
    prices: item.prices && typeof item.prices === "object" ? item.prices : { Regular: Number(item.price) || 0 },
    image: String(item.image || getFoodImage(item.name, category.title) || ""),
  })),
}));

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

function findMenuItemById(itemId) {
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

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/menu", (_req, res) => {
  return res.json(memoryMenuCategories);
});

app.post("/api/menu", (req, res) => {
  try {
    const { categoryId, categoryTitle, name, prices, image } = req.body;
    if (!String(name || "").trim()) {
      return res.status(400).json({ message: "Item name is required." });
    }

    let targetCategory = findCategoryByIdOrTitle(categoryId, categoryTitle);
    if (!targetCategory) {
      if (!String(categoryTitle || "").trim()) {
        return res.status(400).json({ message: "Category is required." });
      }
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
    };

    targetCategory.items.push(nextItem);
    const payload = { categoryId: targetCategory.id, categoryTitle: targetCategory.title, item: nextItem };
    io.emit("menu_created", payload);
    return res.status(201).json(payload);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to add menu item." });
  }
});

app.patch("/api/menu/:id", (req, res) => {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isFinite(itemId)) {
      return res.status(400).json({ message: "Invalid menu item id." });
    }

    const found = findMenuItemById(itemId);
    if (!found) {
      return res.status(404).json({ message: "Menu item not found." });
    }

    const { name, prices, image, categoryId, categoryTitle } = req.body;
    const updatedItem = {
      ...found.item,
      name: String(name || found.item.name).trim(),
      prices: prices ? normalizePrices(prices) : found.item.prices,
      image: image !== undefined ? String(image || "") : String(found.item.image || getFoodImage(name || found.item.name, found.category.title) || ""),
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

    const payload = { categoryId: targetCategory.id, categoryTitle: targetCategory.title, item: updatedItem };
    io.emit("menu_updated", payload);
    return res.json(payload);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update menu item." });
  }
});

app.delete("/api/menu/:id", (req, res) => {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isFinite(itemId)) {
      return res.status(400).json({ message: "Invalid menu item id." });
    }

    const found = findMenuItemById(itemId);
    if (!found) {
      return res.status(404).json({ message: "Menu item not found." });
    }

    found.category.items.splice(found.index, 1);
    io.emit("menu_deleted", { id: itemId });
    return res.json({ ok: true, id: itemId });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to delete menu item." });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    const { customerName, phone, address, items, total, deliveryCharge } = req.body;

    if (!customerName || !phone || !address || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Invalid order payload." });
    }

    const normalizedItems = items.map((item) => ({
      name: item.name,
      variant: item.variant || "Regular",
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      totalPrice: Number(item.totalPrice) || 0,
    }));

    const payload = {
      customerName,
      phone,
      address,
      items: normalizedItems,
      total: Number(total) || 0,
      deliveryCharge: Number(deliveryCharge) || 0,
      status: "Preparing",
      createdAt: new Date(),
    };

    const order = useMongo
      ? await Order.create(payload)
      : {
          _id: randomUUID(),
          ...payload,
        };

    if (!useMongo) {
      memoryOrders.unshift(order);
    }

    io.emit("new_order", order);
    return res.status(201).json(order);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to place order." });
  }
});

app.get("/api/orders", async (_req, res) => {
  try {
    const orders = useMongo ? await Order.find().sort({ createdAt: -1 }) : memoryOrders;
    return res.json(orders);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch orders." });
  }
});

app.patch("/api/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["Preparing", "Ready", "Delivered"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    let updatedOrder;
    if (useMongo) {
      updatedOrder = await Order.findByIdAndUpdate(id, { status }, { new: true });
    } else {
      const index = memoryOrders.findIndex((order) => order._id === id);
      if (index >= 0) {
        memoryOrders[index] = {
          ...memoryOrders[index],
          status,
        };
        updatedOrder = memoryOrders[index];
      }
    }

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found." });
    }

    io.emit("order_updated", updatedOrder);
    return res.json(updatedOrder);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update order status." });
  }
});

app.delete("/api/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let deletedOrder = null;

    if (useMongo) {
      deletedOrder = await Order.findByIdAndDelete(id);
    } else {
      const index = memoryOrders.findIndex((order) => order._id === id);
      if (index >= 0) {
        const [removed] = memoryOrders.splice(index, 1);
        deletedOrder = removed;
      }
    }

    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found." });
    }

    io.emit("order_deleted", { _id: id });
    return res.json({ ok: true, _id: id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to delete order." });
  }
});

const PORT = Number(process.env.PORT) || 5000;
const MONGO_URI = process.env.MONGO_URI;

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

async function startServer() {
  try {
    if (MONGO_URI) {
      await mongoose.connect(MONGO_URI);
      useMongo = true;
      console.log("MongoDB connected");
    } else {
      console.warn("MONGO_URI not set. Running with in-memory order storage.");
    }

    server.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Startup error:", error.message);
    process.exit(1);
  }
}

startServer();
