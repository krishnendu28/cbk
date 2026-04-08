import { io } from "socket.io-client";
import { DEMO_SESSION_KEY } from "@/lib/session";

export const USER_BACKEND_URL = import.meta.env.VITE_API_BASE_URL || "https://cbk-4dmf.onrender.com";
const TABIO_SESSION_TOKEN_KEY = "tabio_session_token";
const DEMO_ORDERS_KEY = "cbk_demo_orders";

function isDemoSessionActive() {
  return typeof localStorage !== "undefined" && localStorage.getItem(DEMO_SESSION_KEY) === "1";
}

function resolveAdminToken() {
  const fromEnv = String(import.meta.env.VITE_ADMIN_API_KEY || "").trim();
  if (fromEnv) return fromEnv;

  const fromLegacyEnv = String(import.meta.env.VITE_OWNER_API_KEY || "").trim();
  if (fromLegacyEnv) return fromLegacyEnv;

  const fromSession = String(localStorage.getItem(TABIO_SESSION_TOKEN_KEY) || "").trim();
  if (fromSession) return fromSession;

  return "";
}

function buildAdminHeaders(extraHeaders: Record<string, string> = {}) {
  const token = resolveAdminToken();
  if (!token) return extraHeaders;

  return {
    ...extraHeaders,
    Authorization: `Bearer ${token}`,
    "x-admin-key": token,
  };
}

function readDemoOrders(): BridgeOrder[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(DEMO_ORDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDemoOrders(orders: BridgeOrder[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(DEMO_ORDERS_KEY, JSON.stringify(orders));
}

export function appendDemoOrder(order: BridgeOrder) {
  const next = [order, ...readDemoOrders().filter((entry) => entry._id !== order._id)];
  saveDemoOrders(next);
  return order;
}

async function buildRequestError(response: Response, fallbackMessage: string) {
  let message = fallbackMessage;
  try {
    const data = await response.json();
    const responseMessage = typeof data?.message === "string" ? data.message.trim() : "";
    if (responseMessage) {
      message = responseMessage;
    }
  } catch {
    // no-op
  }

  return new Error(`${message} (HTTP ${response.status})`);
}

export type BridgeOrderStatus = "Preparing" | "Ready" | "Delivered";

export type BridgeOrderItem = {
  name: string;
  variant: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type BridgeOrder = {
  _id: string;
  customerName: string;
  phone: string;
  address: string;
  items: BridgeOrderItem[];
  total: number;
  deliveryCharge?: number;
  status: BridgeOrderStatus;
  createdAt: string;
};

export type BridgeMenuItem = {
  id: number;
  name: string;
  price: number;
  image: string;
};

export type BridgeMenuGroup = {
  id: string;
  title: string;
  items: BridgeMenuItem[];
};

export type BridgeTableStatus = "available" | "occupied" | "reserved";

export type BridgeTable = {
  id: number;
  name: string;
  capacity: number;
  status: BridgeTableStatus;
};

export type BridgeInventoryItem = {
  id: number;
  name: string;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  cost: number;
};

export type BridgeStaff = {
  id: number;
  name: string;
  email?: string;
  phone: string;
  role: "owner" | "manager" | "cashier" | "kitchen" | "waiter";
  isActive: boolean;
  password?: string;
};

const socket = isDemoSessionActive() ? null : io(USER_BACKEND_URL, { autoConnect: true });

if (typeof window !== "undefined") {
  window.addEventListener("cbk-demo-auth-changed", () => {
    if (localStorage.getItem(DEMO_SESSION_KEY) === "1") {
      socket?.disconnect();
    }
  });
}

const rawMenuCategories: Array<{
  title: string;
  items: Array<{ name: string; prices: Record<string, number> }>;
}> = [
  {
    title: "Non Veg Chakhna",
    items: [
      { name: "Fish Fry (1pc Bhola Bhetki)", prices: { Regular: 75 } },
      { name: "Fish Finger 8pcs", prices: { Half: 125, Full: 190 } },
      { name: "Chicken Pakoda 8pcs", prices: { Half: 125, Full: 190 } },
      { name: "Chicken Lollipop 8pcs", prices: { Half: 130, Full: 210 } },
      { name: "Chicken 65/69 8pc", prices: { Half: 130, Full: 210 } },
      { name: "Liver Fry 250gm", prices: { Regular: 150 } },
      { name: "Egg Bhujiya", prices: { Regular: 70 } },
      { name: "Chicken Cutlet 2pcs", prices: { Regular: 140 } },
      { name: "Chicken Finger 8pcs", prices: { Half: 125, Full: 190 } },
      { name: "Litti Murga", prices: { Regular: 110 } },
      { name: "Mutton Litti", prices: { Regular: 175 } },
    ],
  },
  {
    title: "Veg Chakhna",
    items: [
      { name: "Paneer Pakoda 8pcs", prices: { Half: 120, Full: 190 } },
      { name: "Paneer Pasanda 4pcs", prices: { Half: 120, Full: 190 } },
      { name: "Dry Chilli Veg Ball 8pcs", prices: { Half: 80, Full: 130 } },
      { name: "Masala Papad", prices: { Regular: 50 } },
      { name: "Peanut Masala", prices: { Regular: 69 } },
      { name: "Mushroom Fry 8pcs", prices: { Half: 95, Full: 150 } },
      { name: "French Fries", prices: { Regular: 100 } },
      { name: "Paneer Bhujia", prices: { Half: 95, Full: 150 } },
      { name: "Veg Cutlet 2pcs", prices: { Regular: 99 } },
      { name: "Litti Chokha 2pcs", prices: { Regular: 40 } },
      { name: "Green Salad", prices: { Regular: 60 } },
    ],
  },
  {
    title: "Biryani",
    items: [
      { name: "Egg Handi Biryani", prices: { Regular: 110 } },
      { name: "Chicken Handi Biryani", prices: { Regular: 159 } },
      { name: "Mutton Handi Biryani", prices: { Regular: 259 } },
      { name: "Special Family Pack Biryani", prices: { Regular: 550 } },
    ],
  },
  {
    title: "Tandoor",
    items: [
      { name: "Chicken Tangri Kebab 2pcs", prices: { Half: 130, Full: 210 } },
      { name: "Chicken Tikka Kebab 8pcs", prices: { Half: 130, Full: 210 } },
      { name: "Chicken Reshmi Kebab 8pcs", prices: { Half: 130, Full: 210 } },
      { name: "Paneer Tikka 8pcs", prices: { Half: 110, Full: 180 } },
      { name: "Chicken Malai Kebab 8pcs", prices: { Half: 130, Full: 210 } },
      { name: "Chicken Cheese Kebab 8pcs", prices: { Half: 130, Full: 210 } },
      { name: "Half Chicken Tandoori 500gm", prices: { Regular: 350 } },
      { name: "Full Chicken Tandoori 1kg", prices: { Regular: 650 } },
    ],
  },
  {
    title: "Noodles",
    items: [
      { name: "Veg Noodles", prices: { Half: 60, Full: 99 } },
      { name: "Egg Noodles", prices: { Half: 75, Full: 110 } },
      { name: "Chicken Noodles", prices: { Half: 85, Full: 125 } },
      { name: "Egg Chicken Noodles", prices: { Half: 100, Full: 150 } },
      { name: "Mushroom Noodles", prices: { Half: 100, Full: 150 } },
      { name: "Paneer Noodles", prices: { Half: 70, Full: 130 } },
      { name: "Prawn Noodles", prices: { Half: 100, Full: 150 } },
      { name: "Mixed Noodles (Prawn+Egg+Chicken)", prices: { Half: 120, Full: 175 } },
      { name: "Schezwan Veg Noodles", prices: { Half: 70, Full: 110 } },
      { name: "Schezwan Egg Noodles", prices: { Half: 85, Full: 120 } },
      { name: "Schezwan Chicken Noodles", prices: { Half: 95, Full: 135 } },
      { name: "Schezwan Egg Chicken Noodles", prices: { Half: 110, Full: 160 } },
      { name: "Schezwan Mushroom Noodles", prices: { Half: 110, Full: 160 } },
      { name: "Schezwan Paneer Noodles", prices: { Half: 80, Full: 140 } },
      { name: "Schezwan Prawn Noodles", prices: { Half: 110, Full: 160 } },
      { name: "Schezwan Mixed Noodles", prices: { Half: 130, Full: 185 } },
    ],
  },
  {
    title: "Rolls",
    items: [
      { name: "Double Egg Roll", prices: { Regular: 60 } },
      { name: "Chicken Roll", prices: { Regular: 75 } },
      { name: "Mushroom Roll", prices: { Regular: 75 } },
      { name: "Paneer Roll", prices: { Regular: 65 } },
      { name: "Egg Chicken Roll", prices: { Regular: 99 } },
      { name: "Double Egg Chicken Roll", prices: { Regular: 110 } },
      { name: "Kebab Roll", prices: { Regular: 135 } },
    ],
  },
  {
    title: "Chinese Chilli",
    items: [
      { name: "Chilli Chicken 8pcs", prices: { Half: 125, Full: 199 } },
      { name: "Chicken Schezwan 6pcs", prices: { Half: 110, Full: 180 } },
      { name: "Veg Manchurian 8pcs", prices: { Half: 110, Full: 180 } },
      { name: "Baby Corn Chilli 500ml", prices: { Half: 90, Full: 150 } },
      { name: "Baby Corn Manchurian 500ml", prices: { Half: 90, Full: 150 } },
      { name: "Paneer Chilli 6pcs", prices: { Half: 100, Full: 150 } },
      { name: "Paneer Manchurian 8pcs", prices: { Half: 110, Full: 180 } },
      { name: "Garlic Paneer 8pcs", prices: { Half: 110, Full: 180 } },
      { name: "Mushroom Chilli", prices: { Half: 110, Full: 180 } },
      { name: "Mushroom Manchurian 500ml", prices: { Half: 110, Full: 180 } },
    ],
  },
  {
    title: "Rice",
    items: [
      { name: "Basmati Rice 750ml", prices: { Half: 30, Full: 50 } },
      { name: "Jeera Rice", prices: { Half: 40, Full: 70 } },
      { name: "Kashmari Pulao", prices: { Half: 75, Full: 175 } },
      { name: "Veg Fried Rice", prices: { Half: 60, Full: 99 } },
      { name: "Egg Fried Rice", prices: { Half: 75, Full: 120 } },
      { name: "Chicken Fried Rice", prices: { Half: 85, Full: 135 } },
      { name: "Egg Chicken Fried Rice", prices: { Half: 100, Full: 150 } },
      { name: "Mushroom Fried Rice", prices: { Half: 70, Full: 130 } },
      { name: "Paneer Fried Rice", prices: { Half: 100, Full: 150 } },
      { name: "Prawn Fried Rice", prices: { Half: 100, Full: 150 } },
      { name: "Mixed Fried Rice", prices: { Half: 110, Full: 160 } },
      { name: "Schezwan Veg Fried Rice", prices: { Half: 70, Full: 110 } },
      { name: "Schezwan Egg Fried Rice", prices: { Half: 85, Full: 120 } },
      { name: "Schezwan Chicken Fried Rice", prices: { Half: 100, Full: 150 } },
    ],
  },
  {
    title: "Main Course",
    items: [
      { name: "Handi Mutton", prices: { "250gm": 350, "500gm": 650, "1kg": 1200 } },
      { name: "Handi Chicken", prices: { "250gm": 185, "500gm": 350, "1kg": 650 } },
      { name: "Double Egg Curry", prices: { Regular: 75 } },
      { name: "Egg Tadka 500ml", prices: { Half: 65, Full: 99 } },
      { name: "Chicken Tadka", prices: { Half: 80, Full: 120 } },
      { name: "Chicken Do Piyaza", prices: { Half: 130, Full: 199 } },
      { name: "Kadhai Chicken", prices: { Half: 130, Full: 199 } },
      { name: "Chicken Butter Masala", prices: { Half: 130, Full: 199 } },
      { name: "Chicken Afghani", prices: { Half: 150, Full: 250 } },
      { name: "Chicken Korma", prices: { Half: 150, Full: 250 } },
      { name: "Paneer Do Pyaza 6pcs", prices: { Half: 100, Full: 170 } },
      { name: "Kadhai Paneer 8pcs", prices: { Half: 100, Full: 170 } },
      { name: "Matar Paneer 8pcs", prices: { Half: 110, Full: 180 } },
      { name: "Paneer Butter Masala 8pcs", prices: { Half: 100, Full: 170 } },
      { name: "Palak Paneer 8pcs", prices: { Half: 100, Full: 170 } },
      { name: "Mushroom Masala", prices: { Half: 110, Full: 180 } },
      { name: "Mushroom Butter Masala", prices: { Half: 100, Full: 170 } },
      { name: "Paneer Malai Kofta 4pcs", prices: { Half: 110, Full: 180 } },
    ],
  },
  {
    title: "Regular Thali",
    items: [
      { name: "Curry Chawal", prices: { Regular: 140 } },
      { name: "Rajma Chawal", prices: { Regular: 130 } },
      { name: "Regular Veg Thali", prices: { Regular: 90 } },
      { name: "Regular Paneer/Mushroom Thali", prices: { Regular: 140 } },
      { name: "Regular Egg Thali", prices: { Regular: 110 } },
      { name: "Regular Fish Thali", prices: { Regular: 150 } },
      { name: "Regular Chicken Thali", prices: { Regular: 159 } },
      { name: "Regular Mutton Thali", prices: { Regular: 225 } },
      { name: "Regular Pabda Thali", prices: { Regular: 155 } },
      { name: "Regular Prawn Thali", prices: { Regular: 170 } },
    ],
  },
  {
    title: "Roti/Paratha",
    items: [
      { name: "Lachha Paratha", prices: { Regular: 30 } },
      { name: "Alu Paratha 2pcs", prices: { Regular: 80 } },
      { name: "Paneer Paratha 2pcs", prices: { Regular: 90 } },
      { name: "Tawa Roti", prices: { Regular: 6 } },
      { name: "Butter Roti", prices: { Regular: 8 } },
      { name: "Tandoori Roti", prices: { Regular: 20 } },
      { name: "Butter Tandoori Roti", prices: { Regular: 25 } },
      { name: "Plain Nan", prices: { Regular: 25 } },
      { name: "Butter Nan", prices: { Regular: 30 } },
      { name: "Garlic Nan", prices: { Regular: 35 } },
      { name: "Masala Kulcha", prices: { Regular: 45 } },
      { name: "Atta Tandoori Roti", prices: { Regular: 25 } },
      { name: "Atta Laccha Paratha", prices: { Regular: 30 } },
    ],
  },
  {
    title: "Combos",
    items: [
      { name: "Dal Tadka Combo", prices: { Regular: 99 } },
      { name: "Yellow Dal Fry Combo", prices: { Regular: 115 } },
      { name: "Egg Tadka Combo", prices: { Regular: 115 } },
      { name: "Alu Dum Combo", prices: { Regular: 99 } },
      { name: "Dhaniya/Rezala Chicken Combo", prices: { Regular: 199 } },
      { name: "Handi Mutton Combo", prices: { Regular: 275 } },
      { name: "Prawn Masala Combo", prices: { Regular: 259 } },
      { name: "Fish Combo", prices: { Regular: 140 } },
      { name: "Handi Chicken Combo", prices: { Regular: 175 } },
      { name: "Afghani Chicken Combo", prices: { Regular: 199 } },
      { name: "Chicken Corma Combo", prices: { Regular: 199 } },
      { name: "Handi Paneer Masala Combo", prices: { Regular: 150 } },
      { name: "Butter Paneer Masala Combo", prices: { Regular: 150 } },
      { name: "Matar Paneer Masala Combo", prices: { Regular: 150 } },
      { name: "Chicken Butter Masala Combo", prices: { Regular: 199 } },
      { name: "Chilli Chicken Combo", prices: { Regular: 185 } },
      { name: "Chicken Bharta Combo", prices: { Regular: 175 } },
      { name: "Noodles Combo (Chilli Chicken)", prices: { Regular: 185 } },
      { name: "Noodles Combo (Chilli Paneer)", prices: { Regular: 150 } },
      { name: "Fried Rice Combo (Chilli Paneer)", prices: { Regular: 150 } },
      { name: "Chilli Paneer Combo (Paratha)", prices: { Regular: 175 } },
      { name: "Veg Manchurian Combo", prices: { Regular: 175 } },
      { name: "Palak Paneer Masala Combo", prices: { Regular: 150 } },
    ],
  },
];

function pickBasePrice(prices: Record<string, number>) {
  const values = Object.values(prices);
  return values.length ? Math.min(...values) : 0;
}

function getFoodKeyword(name: string) {
  const lowered = name.toLowerCase();
  if (lowered.includes("biryani")) return "biryani";
  if (lowered.includes("roll")) return "kathi-roll";
  if (lowered.includes("noodle")) return "noodles";
  if (lowered.includes("fried rice") || lowered.includes("rice")) return "fried-rice";
  if (lowered.includes("paneer")) return "paneer";
  if (lowered.includes("mushroom")) return "mushroom-curry";
  if (lowered.includes("prawn")) return "prawn-curry";
  if (lowered.includes("mutton")) return "mutton-curry";
  if (lowered.includes("fish")) return "fish-fry";
  if (lowered.includes("egg")) return "egg-curry";
  if (lowered.includes("kebab") || lowered.includes("tandoori")) return "kebab";
  if (lowered.includes("chilli")) return "chilli-chicken";
  if (lowered.includes("paratha") || lowered.includes("roti") || lowered.includes("nan")) return "paratha";
  if (lowered.includes("thali")) return "indian-thali";
  if (lowered.includes("combo")) return "indian-meal";
  if (lowered.includes("chicken")) return "chicken-curry";
  return "indian-food";
}

function getFoodImageUrl(name: string, seed: string) {
  const keyword = encodeURIComponent(getFoodKeyword(name));
  return `https://loremflickr.com/640/420/indian,food,${keyword}?lock=${encodeURIComponent(seed)}`;
}

function toGroupId(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type BackendMenuCategory = {
  id: string;
  title: string;
  items: Array<{
    id: number;
    name: string;
    prices?: Record<string, number>;
    image?: string;
  }>;
};

export function localFallbackMenuGroups(): BridgeMenuGroup[] {
  return rawMenuCategories
    .map((category, categoryIndex) => ({
      id: toGroupId(category.title) || `group-${categoryIndex + 1}`,
      title: category.title,
      items: category.items.map((item, itemIndex) => ({
        id: categoryIndex * 1000 + itemIndex + 1,
        name: item.name,
        price: pickBasePrice(item.prices),
        image: getFoodImageUrl(item.name, `${category.title}-${itemIndex}`),
      })),
    }))
    .filter((group) => group.items.length > 0);
}

function mapBackendMenuToBridgeGroups(categories: BackendMenuCategory[]): BridgeMenuGroup[] {
  return (Array.isArray(categories) ? categories : [])
    .map((category, categoryIndex) => ({
      id: String(category.id || toGroupId(category.title) || `group-${categoryIndex + 1}`),
      title: String(category.title || "Menu"),
      items: (Array.isArray(category.items) ? category.items : []).map((item, itemIndex) => ({
        id: Number(item.id) || categoryIndex * 1000 + itemIndex + 1,
        name: String(item.name || "Item"),
        price: pickBasePrice(item.prices || { Regular: 0 }),
        image: item.image || getFoodImageUrl(item.name || "food", `${category.title}-${itemIndex}`),
      })),
    }))
    .filter((group) => group.items.length > 0);
}

export function getBridgeMenuGroups(): BridgeMenuGroup[] {
  return localFallbackMenuGroups();
}

export async function fetchBridgeMenuGroups(): Promise<BridgeMenuGroup[]> {
  if (isDemoSessionActive()) {
    return localFallbackMenuGroups();
  }

  try {
    const response = await fetch(`${USER_BACKEND_URL}/api/menu`);
    if (!response.ok) throw new Error("Failed to fetch menu");
    const data = (await response.json()) as BackendMenuCategory[];
    return mapBackendMenuToBridgeGroups(data);
  } catch {
    return localFallbackMenuGroups();
  }
}

export async function createBridgeMenuItem(payload: {
  categoryId?: string;
  categoryTitle: string;
  name: string;
  price: number;
  image?: string;
}) {
  const response = await fetch(`${USER_BACKEND_URL}/api/menu`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      categoryId: payload.categoryId,
      categoryTitle: payload.categoryTitle,
      name: payload.name,
      prices: { Regular: payload.price },
      image: payload.image,
    }),
  });
  if (!response.ok) throw new Error("Failed to create menu item");
  return response.json();
}

export async function updateBridgeMenuItem(
  itemId: number,
  payload: { categoryId?: string; categoryTitle?: string; name?: string; price?: number; image?: string },
) {
  const response = await fetch(`${USER_BACKEND_URL}/api/menu/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      categoryId: payload.categoryId,
      categoryTitle: payload.categoryTitle,
      name: payload.name,
      prices: payload.price !== undefined ? { Regular: payload.price } : undefined,
      image: payload.image,
    }),
  });
  if (!response.ok) throw new Error("Failed to update menu item");
  return response.json();
}

export async function deleteBridgeMenuItem(itemId: number) {
  const response = await fetch(`${USER_BACKEND_URL}/api/menu/${itemId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete menu item");
}

export function subscribeBridgeMenu(onMenuChanged: () => void) {
  if (!socket) return () => {};

  const handler = () => onMenuChanged();
  socket.on("menu_created", handler);
  socket.on("menu_updated", handler);
  socket.on("menu_deleted", handler);

  return () => {
    socket.off("menu_created", handler);
    socket.off("menu_updated", handler);
    socket.off("menu_deleted", handler);
  };
}

export const bridgeMenuGroups: BridgeMenuGroup[] = getBridgeMenuGroups();

const tablesStorageKey = "cbk_admin_tables";
const inventoryStorageKey = "cbk_admin_inventory";
const inventoryChangedEvent = "cbk_inventory_changed";
const staffStorageKey = "cbk_admin_staff";
const staffChangedEvent = "cbk_staff_changed";

const defaultTables: BridgeTable[] = [
  { id: 1, name: "T1", capacity: 4, status: "available" },
  { id: 2, name: "T2", capacity: 4, status: "available" },
  { id: 3, name: "T3", capacity: 2, status: "reserved" },
  { id: 4, name: "T4", capacity: 6, status: "occupied" },
  { id: 5, name: "T5", capacity: 4, status: "available" },
  { id: 6, name: "T6", capacity: 8, status: "available" },
];

const defaultInventory: BridgeInventoryItem[] = [
  { id: 1, name: "Basmati Rice", category: "Grains", unit: "kg", stock: 28, minStock: 8, cost: 95 },
  { id: 2, name: "Chicken", category: "Meat", unit: "kg", stock: 16, minStock: 6, cost: 220 },
  { id: 3, name: "Paneer", category: "Dairy", unit: "kg", stock: 11, minStock: 4, cost: 300 },
  { id: 4, name: "Cooking Oil", category: "Essentials", unit: "ltr", stock: 18, minStock: 5, cost: 130 },
  { id: 5, name: "Spice Mix", category: "Spices", unit: "kg", stock: 7, minStock: 3, cost: 420 },
  { id: 6, name: "Mushroom", category: "Veggies", unit: "kg", stock: 9, minStock: 3, cost: 180 },
];

const defaultStaff: BridgeStaff[] = [
  {
    id: 1,
    name: "Owner",
    email: "owner@tabio.com",
    phone: "9999999999",
    role: "owner",
    isActive: true,
    password: "demo1234",
  },
  {
    id: 2,
    name: "Kitchen Captain",
    email: "kitchen@chkhna.com",
    phone: "9000000002",
    role: "kitchen",
    isActive: true,
  },
];

export function getStoredTables(): BridgeTable[] {
  const raw = localStorage.getItem(tablesStorageKey);
  if (!raw) return defaultTables;
  try {
    const parsed = JSON.parse(raw) as BridgeTable[];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultTables;
    return parsed;
  } catch {
    return defaultTables;
  }
}

export function saveStoredTables(tables: BridgeTable[]) {
  localStorage.setItem(tablesStorageKey, JSON.stringify(tables));
}

export function getStoredInventory(): BridgeInventoryItem[] {
  const raw = localStorage.getItem(inventoryStorageKey);
  if (!raw) return defaultInventory;
  try {
    const parsed = JSON.parse(raw) as BridgeInventoryItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultInventory;
    return parsed;
  } catch {
    return defaultInventory;
  }
}

export function saveStoredInventory(items: BridgeInventoryItem[]) {
  localStorage.setItem(inventoryStorageKey, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(inventoryChangedEvent));
}

export function subscribeInventoryChanges(onChange: (items: BridgeInventoryItem[]) => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key !== inventoryStorageKey) return;
    onChange(getStoredInventory());
  };

  const handleCustomEvent = () => {
    onChange(getStoredInventory());
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(inventoryChangedEvent, handleCustomEvent);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(inventoryChangedEvent, handleCustomEvent);
  };
}

export function createInventoryItem(input: Omit<BridgeInventoryItem, "id">): BridgeInventoryItem {
  const items = getStoredInventory();
  const nextId = items.length ? Math.max(...items.map((item) => item.id)) + 1 : 1;
  const nextItem: BridgeInventoryItem = {
    id: nextId,
    ...input,
  };
  const updated = [nextItem, ...items];
  saveStoredInventory(updated);
  return nextItem;
}

export function updateInventoryItem(itemId: number, patch: Partial<Omit<BridgeInventoryItem, "id">>): BridgeInventoryItem | null {
  const items = getStoredInventory();
  let updatedItem: BridgeInventoryItem | null = null;

  const updated = items.map((item) => {
    if (item.id !== itemId) return item;
    updatedItem = {
      ...item,
      ...patch,
      stock: Math.max(0, Number(patch.stock ?? item.stock)),
      minStock: Math.max(0, Number(patch.minStock ?? item.minStock)),
      cost: Math.max(0, Number(patch.cost ?? item.cost)),
    };
    return updatedItem;
  });

  saveStoredInventory(updated);
  return updatedItem;
}

export function deleteInventoryItem(itemId: number): boolean {
  const items = getStoredInventory();
  const updated = items.filter((item) => item.id !== itemId);
  if (updated.length === items.length) return false;
  saveStoredInventory(updated);
  return true;
}

export function getStoredStaff(): BridgeStaff[] {
  const raw = localStorage.getItem(staffStorageKey);
  if (!raw) return defaultStaff;
  try {
    const parsed = JSON.parse(raw) as BridgeStaff[];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultStaff;
    return parsed;
  } catch {
    return defaultStaff;
  }
}

export function saveStoredStaff(staff: BridgeStaff[]) {
  localStorage.setItem(staffStorageKey, JSON.stringify(staff));
  window.dispatchEvent(new CustomEvent(staffChangedEvent));
}

export function subscribeStaffChanges(onChange: (staff: BridgeStaff[]) => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key !== staffStorageKey) return;
    onChange(getStoredStaff());
  };

  const handleCustomEvent = () => {
    onChange(getStoredStaff());
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(staffChangedEvent, handleCustomEvent);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(staffChangedEvent, handleCustomEvent);
  };
}

export function createStaffMember(input: Omit<BridgeStaff, "id">): BridgeStaff {
  const staff = getStoredStaff();
  const nextId = staff.length ? Math.max(...staff.map((member) => member.id)) + 1 : 1;
  const nextMember: BridgeStaff = {
    id: nextId,
    ...input,
  };
  saveStoredStaff([nextMember, ...staff]);
  return nextMember;
}

export function updateStaffMember(staffId: number, patch: Partial<Omit<BridgeStaff, "id">>): BridgeStaff | null {
  const staff = getStoredStaff();
  let updatedMember: BridgeStaff | null = null;
  const updated = staff.map((member) => {
    if (member.id !== staffId) return member;
    updatedMember = {
      ...member,
      ...patch,
    };
    return updatedMember;
  });
  saveStoredStaff(updated);
  return updatedMember;
}

export function deleteStaffMember(staffId: number): boolean {
  const staff = getStoredStaff();
  if (staff.length <= 1) return false;
  const updated = staff.filter((member) => member.id !== staffId);
  if (updated.length === staff.length) return false;
  saveStoredStaff(updated);
  return true;
}

export async function fetchBridgeOrders(): Promise<BridgeOrder[]> {
  if (isDemoSessionActive()) {
    return readDemoOrders();
  }

  const response = await fetch(`${USER_BACKEND_URL}/api/orders`);
  if (!response.ok) throw new Error("Failed to fetch bridge orders");
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function patchBridgeOrderStatus(orderId: string, status: BridgeOrderStatus): Promise<BridgeOrder> {
  if (isDemoSessionActive()) {
    const orders = readDemoOrders();
    const next = orders.map((order) => (order._id === orderId ? { ...order, status } : order));
    const updated = next.find((order) => order._id === orderId);
    if (!updated) throw new Error("Failed to update order status");
    saveDemoOrders(next);
    return updated;
  }

  const response = await fetch(`${USER_BACKEND_URL}/api/orders/${orderId}`, {
    method: "PATCH",
    headers: buildAdminHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw await buildRequestError(response, "Failed to update order status");
  return response.json();
}

export async function deleteBridgeOrder(orderId: string): Promise<void> {
  if (isDemoSessionActive()) {
    saveDemoOrders(readDemoOrders().filter((order) => order._id !== orderId));
    return;
  }

  const response = await fetch(`${USER_BACKEND_URL}/api/orders/${orderId}`, {
    method: "DELETE",
    headers: buildAdminHeaders(),
  });
  if (!response.ok) throw await buildRequestError(response, "Failed to delete order");
}

export function subscribeBridgeOrders(
  onNewOrder: (order: BridgeOrder) => void,
  onUpdatedOrder: (order: BridgeOrder) => void,
  onDeletedOrder?: (payload: { _id: string }) => void,
) {
  if (!socket) return () => {};

  socket.on("new_order", onNewOrder);
  socket.on("order_updated", onUpdatedOrder);
  if (onDeletedOrder) {
    socket.on("order_deleted", onDeletedOrder);
  }

  return () => {
    socket.off("new_order", onNewOrder);
    socket.off("order_updated", onUpdatedOrder);
    if (onDeletedOrder) {
      socket.off("order_deleted", onDeletedOrder);
    }
  };
}

export function deriveCustomersFromOrders(orders: BridgeOrder[]) {
  const map = new Map<string, { phone: string; name: string; orders: number; spend: number; lastVisit: string; address: string }>();

  for (const order of orders) {
    const key = order.phone || `${order.customerName}-${order._id}`;
    const existing = map.get(key);
    if (existing) {
      existing.orders += 1;
      existing.spend += order.total;
      if (new Date(order.createdAt) > new Date(existing.lastVisit)) {
        existing.lastVisit = order.createdAt;
        existing.name = order.customerName;
        existing.address = order.address;
      }
    } else {
      map.set(key, {
        phone: order.phone,
        name: order.customerName,
        orders: 1,
        spend: order.total,
        lastVisit: order.createdAt,
        address: order.address,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.orders - a.orders);
}

export function nextBridgeStatus(status: BridgeOrderStatus): BridgeOrderStatus {
  if (status === "Preparing") return "Ready";
  if (status === "Ready") return "Delivered";
  return "Delivered";
}
