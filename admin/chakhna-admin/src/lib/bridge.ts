import { DEMO_SESSION_KEY } from "@/lib/session";
import { getMenuItemImageUrl } from "@/lib/menu-item-images";

type RawMenuItem = {
  name: string;
  prices?: Record<string, number>;
  image?: string;
  available?: boolean;
};

type RawMenuCategory = {
  title: string;
  items: RawMenuItem[];
};

export const USER_BACKEND_URL = import.meta.env.VITE_API_BASE_URL || "https://n6dorzvkp2.execute-api.ap-south-1.amazonaws.com";
const DEMO_AUTH = import.meta.env.VITE_TABIO_DEMO_AUTH === "true";
const TABIO_SESSION_TOKEN_KEY = "tabio_session_token";
const DEMO_ORDERS_KEY = "cbk_demo_orders";
const DEMO_MENU_KEY = "cbk_demo_menu_groups";
const DEMO_MENU_CHANGED_EVENT = "cbk_demo_menu_changed";

function isDemoSessionActive() {
  return DEMO_AUTH && typeof localStorage !== "undefined" && localStorage.getItem(DEMO_SESSION_KEY) === "1";
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

function normalizeMenuImageForApi(image?: string) {
  const value = String(image || "").trim();
  if (!value) return undefined;

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  try {
    return new URL(value, USER_BACKEND_URL).toString();
  } catch {
    return undefined;
  }
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

function readDemoMenuGroups(): BridgeMenuGroup[] {
  if (typeof localStorage === "undefined") return localFallbackMenuGroups();

  try {
    const raw = localStorage.getItem(DEMO_MENU_KEY);
    if (!raw) {
      return localFallbackMenuGroups();
    }

    const parsed = JSON.parse(raw) as BridgeMenuGroup[];
    if (!Array.isArray(parsed)) {
      return localFallbackMenuGroups();
    }

    return parsed
      .map((group, groupIndex) => ({
        id: String(group.id || toGroupId(group.title) || `group-${groupIndex + 1}`),
        title: String(group.title || "Menu"),
        items: (Array.isArray(group.items) ? group.items : []).map((item, itemIndex) => ({
          id: Number(item.id) || groupIndex * 1000 + itemIndex + 1,
          name: String(item.name || "Item"),
          price: Number(item.price) || 0,
          image: String(item.image || getFoodImageUrl(item.name || "food", `${group.title}-${itemIndex}`)),
          available: item.available !== false,
        })),
      }))
      .filter((group) => group.items.length > 0);
  } catch {
    return localFallbackMenuGroups();
  }
}

function saveDemoMenuGroups(groups: BridgeMenuGroup[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(DEMO_MENU_KEY, JSON.stringify(groups));
  window.dispatchEvent(new CustomEvent(DEMO_MENU_CHANGED_EVENT));
}

function getNextMenuItemId(groups: BridgeMenuGroup[]) {
  const ids = groups.flatMap((group) => group.items.map((item) => Number(item.id) || 0));
  return ids.length ? Math.max(...ids) + 1 : 1;
}

function findDemoGroup(groups: BridgeMenuGroup[], categoryId?: string, categoryTitle?: string) {
  const normalizedTitle = String(categoryTitle || "").trim().toLowerCase();

  if (categoryId) {
    const byId = groups.find((group) => group.id === categoryId);
    if (byId) return byId;
  }

  if (normalizedTitle) {
    const byTitle = groups.find((group) => group.title.trim().toLowerCase() === normalizedTitle);
    if (byTitle) return byTitle;
  }

  return null;
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

export type BridgeOrderingStatus = {
  isOrderingOpen: boolean;
  updatedAt?: string;
};

export type BridgePushResult = {
  sent: number;
  invalidRemoved: number;
};

export type BridgePushHealth = {
  registeredDevices: number;
  lastBroadcast: {
    sent: number;
    invalidRemoved: number;
    message: string;
    createdAt: string;
  } | null;
};

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
  available: boolean;
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

const rawMenuCategories: Array<{
  title: string;
  items: Array<{ name: string; prices: Record<string, number>; available?: boolean }>;
}> = [
  {
    title: "Combos",
    items: [
      { name: "Dal Tadka Combo (Roti)", prices: { Regular: 120 } },
      { name: "Yellow Dal Fry Combo", prices: { Regular: 130 } },
      { name: "Egg Tadka Combo (Roti)", prices: { Regular: 135 } },
      { name: "Ala Dum Combo (Roti)", prices: { Regular: 120 } },
      { name: "Handi Paneer Masala Combo (Roti)", prices: { Regular: 170 } },
      { name: "Butter Paneer Masala Combo", prices: { Regular: 180 } },
      { name: "Muter Paneer Masala Combo", prices: { Regular: 180 } },
      { name: "Noodles Combo (Chilli Paneer)", prices: { Regular: 180 } },
      { name: "Noodles Combo (Chilli Mushroom)", prices: { Regular: 180 } },
      { name: "Veg Manchurian Combo", prices: { Regular: 195 } },
      { name: "Handi Mutton Combo", prices: { Regular: 310 } },
      { name: "Prawn Masala Combo", prices: { Regular: 259 } },
      { name: "Fish Combo", prices: { Regular: 150 } },
      { name: "Handi Chicken Combo (Roti/Naan/Rice)", prices: { Regular: 199 } },
      { name: "Chicken Butter Masala Combo", prices: { Regular: 215 } },
      { name: "Chili Chicken Combo", prices: { Regular: 199 } },
      { name: "Chicken Bharta Combo", prices: { Regular: 199 } },
      { name: "Noodles Combo (Chili Chicken)", prices: { Regular: 199 } },
    ],
  },
  {
    title: "Biryani",
    items: [
      { name: "Egg Biryani", prices: { Regular: 130 } },
      { name: "Special Handi Chicken Biryani", prices: { Regular: 190 } },
      { name: "Mutton Handi Biryani", prices: { Regular: 269 } },
      { name: "Chicken Biryani", prices: { Regular: 140 } },
      { name: "Chicken Biryani + Hand Chicken Combo", prices: { Regular: 249 } },
      { name: "Special Family Pack Biryani", prices: { Regular: 649 } },
    ],
  },
  {
    title: "Non Veg Chakhna",
    items: [
      { name: "Fish Finger (8 pcs)", prices: { Half: 150, Full: 220 } },
      { name: "Chilli Fish", prices: { Half: 150, Full: 220 } },
      { name: "Chicken Pakoda (8 pcs)", prices: { Half: 150, Full: 220 } },
      { name: "Chicken Lollipop (Drums of Heaven 8 pcs)", prices: { Half: 150, Full: 220 } },
      { name: "Chicken 65(8) (8 pcs)", prices: { Half: 150, Full: 220 } },
      { name: "Chilli Chicken Dry (8 pcs)", prices: { Half: 150, Full: 220 } },
      { name: "Egg Bhurji", prices: { Regular: 90 } },
      { name: "Chicken Finger (8 pcs)", prices: { Half: 150, Full: 220 } },
      { name: "Litti Murga (2 pcs Litti + 1 pc Chicken)", prices: { Regular: 130 } },
      { name: "Mutton Litti (2 pcs Litti + 1 pc Mutton)", prices: { Regular: 199 } },
    ],
  },
  {
    title: "Veg Chakhna",
    items: [
      { name: "Paneer Pakoda (8 pcs)", prices: { Half: 130, Full: 199 } },
      { name: "Chilli Paneer Dry (8 pcs)", prices: { Half: 130, Full: 199 } },
      { name: "Chilli Mushroom Dry (8 pcs)", prices: { Half: 130, Full: 199 } },
      { name: "Chilli Veg Ball Dry (8 pcs)", prices: { Half: 130, Full: 199 } },
      { name: "Masala Papad", prices: { Regular: 70 } },
      { name: "Mushroom Fry (8 pcs)", prices: { Half: 100, Full: 160 } },
      { name: "French Fries", prices: { Regular: 100 } },
      { name: "Paneer Bhurji", prices: { Half: 120, Full: 185 } },
      { name: "Litti Chokha (2 pcs)", prices: { Regular: 50 } },
      { name: "Green Salad", prices: { Regular: 75 } },
    ],
  },
  {
    title: "Ahuna/Champaran",
    items: [
      { name: "Handi Mutton (15-16 pcs)", prices: { "250gm": 360, "500gm": 699, "1kg": 1250 } },
      { name: "Handi Chicken (15-16 pcs)", prices: { "250gm": 199, "500gm": 385, "1kg": 675 } },
    ],
  },
  {
    title: "Tandoor",
    items: [
      { name: "Chicken Tangri Kebab (2 pcs)", prices: { Half: 130, Full: 210 } },
      { name: "Chicken Tikka Kebab (8 pcs)", prices: { Half: 150, Full: 220 } },
      { name: "Chicken Reshmi Kebab (8 pcs)", prices: { Half: 150, Full: 220 } },
      { name: "Paneer Tikka (8 pcs)", prices: { Half: 130, Full: 199 } },
      { name: "Chicken Malai Kebab (8 pcs)", prices: { Half: 150, Full: 220 } },
      { name: "Half Chicken Tandoori (500 gm)", prices: { Regular: 385 } },
      { name: "Full Chicken Tandoori (1 kg)", prices: { Regular: 675 } },
    ],
  },
  {
    title: "Noodles",
    items: [
      { name: "Veg Noodles", prices: { Half: 80, Full: 120 } },
      { name: "Egg Noodles", prices: { Half: 95, Full: 130 } },
      { name: "Chicken Noodles", prices: { Half: 105, Full: 145 } },
      { name: "Egg Chicken Noodles", prices: { Half: 120, Full: 170 } },
      { name: "Mushroom Noodles (250 ml)", prices: { Half: 120, Full: 170 } },
      { name: "Paneer Noodles", prices: { Half: 90, Full: 150 } },
      { name: "Prawn Noodles (250 ml)", prices: { Half: 120, Full: 170 } },
      { name: "Mixed Noodles (Veg, Egg, Chicken)", prices: { Half: 140, Full: 195 } },
      { name: "Schezwan Veg Noodles", prices: { Half: 85, Full: 125 } },
      { name: "Schezwan Egg Noodles", prices: { Half: 100, Full: 140 } },
      { name: "Schezwan Chicken Noodles", prices: { Half: 110, Full: 150 } },
      { name: "Schezwan Egg Chicken Noodles", prices: { Half: 125, Full: 170 } },
      { name: "Schezwan Mushroom Noodles", prices: { Half: 125, Full: 170 } },
      { name: "Schezwan Paneer Noodles", prices: { Half: 95, Full: 155 } },
      { name: "Schezwan Prawn Noodles", prices: { Half: 130, Full: 180 } },
      { name: "Schezwan Mixed Noodles (Prawn+Egg+Chicken, 250 ml)", prices: { Half: 145, Full: 200 } },
    ],
  },
  {
    title: "Rice (750 ML)",
    items: [
      { name: "Plain Rice", prices: { Half: 40, Full: 70 } },
      { name: "Jeera Rice", prices: { Half: 50, Full: 85 } },
      { name: "Basanti Pulao", prices: { Half: 100, Full: 175 } },
      { name: "Veg Fried Rice", prices: { Half: 90, Full: 125 } },
      { name: "Egg Fried Rice", prices: { Half: 100, Full: 135 } },
      { name: "Chicken Fried Rice", prices: { Half: 110, Full: 130 } },
      { name: "Egg Chicken Fried Rice", prices: { Half: 130, Full: 170 } },
      { name: "Mixed Fried Rice", prices: { Half: 140, Full: 185 } },
      { name: "Schezwan Veg Fried Rice", prices: { Half: 110, Full: 160 } },
      { name: "Schezwan Egg Fried Rice", prices: { Half: 110, Full: 155 } },
      { name: "Schezwan Chicken Fried Rice", prices: { Half: 120, Full: 160 } },
    ],
  },
  {
    title: "Veg Main Course",
    items: [
      { name: "Crispy Alu Bhaja", prices: { Regular: 55 } },
      { name: "Kashmiri Alu Dum (6 pcs)", prices: { Half: 90, Full: 140 } },
      { name: "Dal Tadka 500 ml", prices: { Half: 90, Full: 140 } },
      { name: "Butter Dal Fry", prices: { Half: 90, Full: 140 } },
      { name: "Chana Masala 500 ml", prices: { Half: 90, Full: 140 } },
      { name: "Mixed Veg", prices: { Half: 100, Full: 160 } },
      { name: "Paneer Do Pyaza (6 pcs)", prices: { Half: 130, Full: 199 } },
      { name: "Kadhai Paneer (8 pcs)", prices: { Half: 130, Full: 199 } },
      { name: "Paneer Kashmiri (8 pcs)", prices: { Half: 130, Full: 199 } },
      { name: "Matar Paneer (8 pcs)", prices: { Half: 130, Full: 199 } },
      { name: "Paneer Butter Masala (8 pcs)", prices: { Half: 130, Full: 199 } },
      { name: "Palak Paneer (8 pcs)", prices: { Half: 130, Full: 199 } },
      { name: "Mushroom Masala", prices: { Half: 130, Full: 199 } },
      { name: "Mushroom Butter Masala", prices: { Half: 135, Full: 210 } },
      { name: "Kadhai Mushroom (Spicy)", prices: { Half: 130, Full: 199 } },
      { name: "Mushroom Do Pyaza", prices: { Half: 130, Full: 199 } },
      { name: "Matar Mushroom Masala", prices: { Half: 130, Full: 199 } },
      { name: "Paneer Malai Kofta (4 pcs)", prices: { Half: 140, Full: 210 } },
      { name: "Veg Manchurian", prices: { Half: 130, Full: 199 } },
      { name: "Baby corn chilli", prices: { Half: 130, Full: 199 } },
      { name: "Garlic paneer", prices: { Half: 130, Full: 199 } },
    ],
  },
  {
    title: "Non Veg Main Course",
    items: [
      { name: "Double Egg Curry / Omelet Curry", prices: { Regular: 85 } },
      { name: "Egg Tadka 500 ML", prices: { Half: 100, Full: 140 } },
      { name: "Handi Mutton 250 GM", prices: { Half: 220, Full: 350 } },
      { name: "Chicken Tadka", prices: { Half: 110, Full: 150 } },
      { name: "Egg Chicken Tadka", prices: { Half: 120, Full: 165 } },
      { name: "Handi Chicken 250 GM (4 pcs)", prices: { Half: 130, Full: 199 } },
      { name: "Chicken Do Pyaza (4 pcs)", prices: { Half: 150, Full: 220 } },
      { name: "Kadhai Chicken (4 pcs)", prices: { Half: 150, Full: 220 } },
      { name: "Chicken Black Pepper (4 pcs)", prices: { Half: 160, Full: 220 } },
      { name: "Dhaniya Chicken (4 pcs)", prices: { Half: 180, Full: 270 } },
      { name: "Chicken Bhurta 250 GM", prices: { Half: 150, Full: 220 } },
      { name: "Chicken Butter Masala (4 pcs)", prices: { Half: 150, Full: 220 } },
      { name: "Chicken Tikka Butter Masala (4 pcs)", prices: { Half: 180, Full: 270 } },
      { name: "Chicken Korma (4 pcs)", prices: { Half: 180, Full: 270 } },
      { name: "Chicken Schezwan (8 pcs)", prices: { Half: 160, Full: 240 } },
      { name: "Chingari Malai Curry (5 pcs)", prices: { Half: 160, Full: 250 } },
      { name: "Garlic chicken", prices: { Half: 160, Full: 240 } },
    ],
  },
  {
    title: "Regular Thali",
    items: [
      { name: "Regular Veg Thali", prices: { Regular: 99 } },
      { name: "Regular Paneer/Mushroom Thali", prices: { Regular: 160 } },
      { name: "Regular Egg Thali", prices: { Regular: 120 } },
      { name: "Regular Fish Thali", prices: { Regular: 170 } },
      { name: "Regular Chicken Thali", prices: { Regular: 170 } },
      { name: "Regular Mutton Thali", prices: { Regular: 249 } },
      { name: "Regular Prawn Thali", prices: { Regular: 190 } },
    ],
  },
  {
    title: "Roti/Paratha",
    items: [
      { name: "Laccha Paratha", prices: { Regular: 40 } },
      { name: "Alu Paratha (2 pcs)", prices: { Regular: 100 } },
      { name: "Paneer Paratha (2 pcs)", prices: { Regular: 110 } },
      { name: "Tawa Roti", prices: { Regular: 7 } },
      { name: "Butter Roti", prices: { Regular: 10 } },
      { name: "Tandoori Roti (1 pc)", prices: { Regular: 30 } },
      { name: "Butter Tandoori Roti (1 pc)", prices: { Regular: 35 } },
      { name: "Plain Naan", prices: { Regular: 35 } },
      { name: "Butter Naan (2 slices)", prices: { Regular: 45 } },
      { name: "Garlic Naan", prices: { Regular: 50 } },
      { name: "Masala Kulcha", prices: { Regular: 55 } },
      { name: "Atta Tandoori Roti", prices: { Regular: 25 } },
      { name: "Atta Laccha Paratha", prices: { Regular: 40 } },
    ],
  },
  {
    title: "Beverages & Extras",
    items: [
      { name: "Cold Drink (600 ml)", prices: { Regular: 50 } },
      { name: "Mineral Water (1 Ltr)", prices: { Regular: 20 } },
      { name: "Sweet Lassi", prices: { Regular: 50 } },
      { name: "Masala Chauz", prices: { Regular: 30 } },
      { name: "Fresh Lime Soda", prices: { Regular: 40 } },
      { name: "Extra Salad", prices: { Regular: 40 } },
      { name: "Extra Rayta", prices: { Regular: 40 } },
      { name: "Papad (2 pcs)", prices: { Regular: 20 } },
      { name: "Onion (2 pcs)", prices: { Regular: 20 } },
      { name: "Onion Salad", prices: { Regular: 20 } },
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
    available?: boolean;
  }>;
};

export function localFallbackMenuGroups(): BridgeMenuGroup[] {
  return (rawMenuCategories as RawMenuCategory[])
    .map((category, categoryIndex) => ({
      id: toGroupId(category.title) || `group-${categoryIndex + 1}`,
      title: category.title,
      items: category.items.map((item, itemIndex) => ({
        id: categoryIndex * 1000 + itemIndex + 1,
        name: item.name,
        price: pickBasePrice(item.prices),
        image: getMenuItemImageUrl(item.name, category.title, getFoodImageUrl(item.name, `${category.title}-${itemIndex}`)),
        available: true,
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
        image: getMenuItemImageUrl(
          String(item.name || "Item"),
          String(category.title || "Menu"),
          String(item.image || getFoodImageUrl(item.name || "food", `${category.title}-${itemIndex}`)),
        ),
        available: item.available !== false,
      })),
    }))
    .filter((group) => group.items.length > 0);
}

export function getBridgeMenuGroups(): BridgeMenuGroup[] {
  return isDemoSessionActive() ? readDemoMenuGroups() : localFallbackMenuGroups();
}

export async function fetchBridgeMenuGroups(): Promise<BridgeMenuGroup[]> {
  if (isDemoSessionActive()) {
    return readDemoMenuGroups();
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
  available?: boolean;
}) {
  if (isDemoSessionActive()) {
    const groups = readDemoMenuGroups();
    let targetGroup = findDemoGroup(groups, payload.categoryId, payload.categoryTitle);

    if (!targetGroup) {
      targetGroup = {
        id: payload.categoryId || toGroupId(payload.categoryTitle) || `group-${groups.length + 1}`,
        title: payload.categoryTitle.trim(),
        items: [],
      };
      groups.push(targetGroup);
    }

    const nextItemId = getNextMenuItemId(groups);
    const item = {
      id: nextItemId,
      name: payload.name.trim(),
      price: Number(payload.price) || 0,
      image: String(payload.image || getFoodImageUrl(payload.name, `${targetGroup.title}-${nextItemId}`)),
      available: payload.available !== false,
    };

    targetGroup.items.push(item);
    saveDemoMenuGroups(groups);
    return { categoryId: targetGroup.id, categoryTitle: targetGroup.title, item };
  }

  const response = await fetch(`${USER_BACKEND_URL}/api/menu`, {
    method: "POST",
    headers: buildAdminHeaders({
      "Content-Type": "application/json",
    }),
    
    body: JSON.stringify({
      categoryId: payload.categoryId,
      categoryTitle: payload.categoryTitle,
      name: payload.name,
      prices: { Regular: payload.price },
      image: normalizeMenuImageForApi(payload.image),
      available: payload.available !== false,
    }),
  });
  if (!response.ok) throw await buildRequestError(response, "Failed to create menu item");
  return response.json();
}

export async function updateBridgeMenuItem(
  itemId: number,
  payload: { categoryId?: string; categoryTitle?: string; name?: string; price?: number; image?: string; available?: boolean },
) {
  if (isDemoSessionActive()) {
    const groups = readDemoMenuGroups();
    const sourceGroup = groups.find((group) => group.items.some((item) => item.id === itemId));
    if (!sourceGroup) throw new Error("Failed to update menu item");

    const sourceIndex = sourceGroup.items.findIndex((item) => item.id === itemId);
    const sourceItem = sourceGroup.items[sourceIndex];
    const updatedItem = {
      ...sourceItem,
      name: payload.name !== undefined ? payload.name.trim() : sourceItem.name,
      price: payload.price !== undefined ? Number(payload.price) || 0 : sourceItem.price,
      image: payload.image !== undefined
        ? String(payload.image || getFoodImageUrl(payload.name || sourceItem.name, `${sourceGroup.title}-${itemId}`))
        : sourceItem.image,
      available: payload.available !== undefined ? Boolean(payload.available) : sourceItem.available !== false,
    };

    let targetGroup = findDemoGroup(groups, payload.categoryId, payload.categoryTitle) || sourceGroup;
    if (!findDemoGroup(groups, payload.categoryId, payload.categoryTitle) && String(payload.categoryTitle || "").trim()) {
      targetGroup = {
        id: payload.categoryId || toGroupId(payload.categoryTitle || sourceGroup.title) || `group-${groups.length + 1}`,
        title: String(payload.categoryTitle || sourceGroup.title).trim(),
        items: [],
      };
      groups.push(targetGroup);
    }

    sourceGroup.items.splice(sourceIndex, 1);
    targetGroup.items.push(updatedItem);
    saveDemoMenuGroups(groups);
    return { categoryId: targetGroup.id, categoryTitle: targetGroup.title, item: updatedItem };
  }

  const response = await fetch(`${USER_BACKEND_URL}/api/menu/${itemId}`, {
    method: "PATCH",
    headers: buildAdminHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      categoryId: payload.categoryId,
      categoryTitle: payload.categoryTitle,
      name: payload.name,
      prices: payload.price !== undefined ? { Regular: payload.price } : undefined,
      image: normalizeMenuImageForApi(payload.image),
      available: payload.available,
    }),
  });
  if (!response.ok) throw await buildRequestError(response, "Failed to update menu item");
  return response.json();
}

export async function deleteBridgeMenuItem(itemId: number) {
  if (isDemoSessionActive()) {
    const groups = readDemoMenuGroups();
    const sourceGroup = groups.find((group) => group.items.some((item) => item.id === itemId));
    if (!sourceGroup) throw new Error("Failed to delete menu item");

    sourceGroup.items = sourceGroup.items.filter((item) => item.id !== itemId);
    saveDemoMenuGroups(groups.filter((group) => group.items.length > 0));
    return;
  }

  const response = await fetch(`${USER_BACKEND_URL}/api/menu/${itemId}`, {
    method: "DELETE",
    headers: buildAdminHeaders(),
  });
  if (!response.ok) throw new Error("Failed to delete menu item");
}

export async function resetBridgeMenu(): Promise<{ categories: number; items: number }> {
  if (isDemoSessionActive()) {
    saveDemoMenuGroups(localFallbackMenuGroups());
    window.dispatchEvent(new Event(DEMO_MENU_CHANGED_EVENT));
    const groups = localFallbackMenuGroups();
    return {
      categories: groups.length,
      items: groups.reduce((sum, group) => sum + group.items.length, 0),
    };
  }

  const response = await fetch(`${USER_BACKEND_URL}/api/menu/reset`, {
    method: "POST",
    headers: buildAdminHeaders(),
  });
  if (!response.ok) throw await buildRequestError(response, "Failed to reset menu");
  return response.json();
}

const MENU_POLL_INTERVAL_MS = 30000;
const ORDERS_POLL_INTERVAL_MS = 8000;
const INVENTORY_POLL_INTERVAL_MS = 8000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function subscribeBridgeMenu(onMenuChanged: () => void) {
  if (isDemoSessionActive()) {
    const handler = () => onMenuChanged();
    window.addEventListener(DEMO_MENU_CHANGED_EVENT, handler);
    window.addEventListener("storage", handler);

    return () => {
      window.removeEventListener(DEMO_MENU_CHANGED_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }

  let lastSignature = "";

  const poll = async () => {
    try {
      const groups = await fetchBridgeMenuGroups();
      const signature = JSON.stringify(groups);
      if (signature !== lastSignature) {
        lastSignature = signature;
        onMenuChanged();
      }
    } catch {
      // transient error, keep polling
    }
  };

  poll();
  const timer = window.setInterval(poll, MENU_POLL_INTERVAL_MS);

  return () => window.clearInterval(timer);
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
    email: "kitchen@chakhna.com",
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

export async function fetchBackendInventory(): Promise<BridgeInventoryItem[]> {
  const response = await fetch(`${USER_BACKEND_URL}/api/inventory`);
  if (!response.ok) throw new Error("Failed to fetch backend inventory");
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

function sameInventorySet(a: BridgeInventoryItem[], b: BridgeInventoryItem[]) {
  if (a.length !== b.length) return false;
  const aJson = JSON.stringify(a);
  const bJson = JSON.stringify(b);
  return aJson === bJson;
}

// Pull the latest inventory from the backend into localStorage when the backend is
// reachable (real-time across devices/tabs). Returns the current localStorage items.
export async function syncInventoryFromBackend(): Promise<BridgeInventoryItem[]> {
  if (isDemoSessionActive()) {
    return getStoredInventory();
  }
  try {
    const backendItems = await fetchBackendInventory();
    const current = getStoredInventory();
    if (backendItems.length === 0) return current;
    if (!sameInventorySet(current, backendItems)) {
      localStorage.setItem(inventoryStorageKey, JSON.stringify(backendItems));
      window.dispatchEvent(new CustomEvent(inventoryChangedEvent));
      return backendItems;
    }
    return current;
  } catch {
    return getStoredInventory();
  }
}

async function pushInventoryToBackend(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<void> {
  if (isDemoSessionActive()) return;
  try {
    const response = await fetch(`${USER_BACKEND_URL}/api/inventory${path}`, {
      method,
      headers: buildAdminHeaders({
        "Content-Type": "application/json",
      }),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) {
      // fall back to localStorage-only (backend offline / not deployed)
      return;
    }
  } catch {
    // backend offline - keep localStorage as the working set
  }
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

  const poll = async () => {
    const items = await syncInventoryFromBackend();
    onChange(items);
  };
  poll();
  const timer = window.setInterval(poll, INVENTORY_POLL_INTERVAL_MS);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(inventoryChangedEvent, handleCustomEvent);
    window.clearInterval(timer);
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
  void pushInventoryToBackend("POST", "", nextItem);
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
  if (updatedItem) {
    void pushInventoryToBackend("PATCH", `/${itemId}`, updatedItem);
  }
  return updatedItem;
}

export function deleteInventoryItem(itemId: number): boolean {
  const items = getStoredInventory();
  const updated = items.filter((item) => item.id !== itemId);
  if (updated.length === items.length) return false;
  saveStoredInventory(updated);
  void pushInventoryToBackend("DELETE", `/${itemId}`);
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

export async function fetchOrderingStatus(): Promise<BridgeOrderingStatus> {
  if (isDemoSessionActive()) {
    return {
      isOrderingOpen: true,
      updatedAt: new Date().toISOString(),
    };
  }

  const response = await fetch(`${USER_BACKEND_URL}/api/shop/ordering-status`);
  if (!response.ok) {
    throw await buildRequestError(response, "Failed to fetch ordering status");
  }

  const data = await response.json();
  return {
    isOrderingOpen: Boolean(data?.isOrderingOpen),
    updatedAt: typeof data?.updatedAt === "string" ? data.updatedAt : undefined,
  };
}

export async function updateOrderingStatus(isOrderingOpen: boolean): Promise<BridgeOrderingStatus> {
  if (isDemoSessionActive()) {
    return {
      isOrderingOpen,
      updatedAt: new Date().toISOString(),
    };
  }

  const response = await fetch(`${USER_BACKEND_URL}/api/shop/ordering-status`, {
    method: "PATCH",
    headers: buildAdminHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ isOrderingOpen }),
  });

  if (!response.ok) {
    throw await buildRequestError(response, "Failed to update ordering status");
  }

  const data = await response.json();
  return {
    isOrderingOpen: Boolean(data?.isOrderingOpen),
    updatedAt: typeof data?.updatedAt === "string" ? data.updatedAt : undefined,
  };
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

export type BroadcastNotificationOptions = {
  message?: string;
  discountRate?: number;
  discountCode?: string;
  expiresInHours?: number;
};

export async function sendBroadcastNotification(options: BroadcastNotificationOptions): Promise<{
  notification: { id: string; message: string; createdAt: string };
  push: BridgePushResult;
}> {
  const trimmedMessage = String(options?.message || "").trim();
  const discountRate = Number(options?.discountRate || 0);
  if (!trimmedMessage && discountRate <= 0) {
    throw new Error("Notification message or discount offer is required");
  }

  if (isDemoSessionActive()) {
    throw new Error("Broadcast notifications are not available in demo mode");
  }

  const response = await fetch(`${USER_BACKEND_URL}/api/notifications/broadcast`, {
    method: "POST",
    headers: buildAdminHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      ...(trimmedMessage ? { message: trimmedMessage } : {}),
      ...(discountRate > 0
        ? {
            discountRate,
            discountCode: String(options?.discountCode || "").trim() || undefined,
            expiresInHours: Math.max(1, Number(options?.expiresInHours || 48)),
          }
        : {}),
    }),
  });

  if (!response.ok) {
    throw await buildRequestError(response, "Failed to send notification");
  }

  const data = await response.json();
  return {
    notification: data?.notification,
    push: {
      sent: Number(data?.push?.sent || 0),
      invalidRemoved: Number(data?.push?.invalidRemoved || 0),
    },
  };
}

export async function fetchPushNotificationHealth(): Promise<BridgePushHealth> {
  if (isDemoSessionActive()) {
    return {
      registeredDevices: 0,
      lastBroadcast: null,
    };
  }

  const response = await fetch(`${USER_BACKEND_URL}/api/notifications/health`, {
    headers: buildAdminHeaders(),
  });

  if (!response.ok) {
    throw await buildRequestError(response, "Failed to fetch push notification health");
  }

  const data = await response.json();
  const lastBroadcast = data?.lastBroadcast
    ? {
        sent: Number(data.lastBroadcast.sent || 0),
        invalidRemoved: Number(data.lastBroadcast.invalidRemoved || 0),
        message: String(data.lastBroadcast.message || ""),
        createdAt: String(data.lastBroadcast.createdAt || ""),
      }
    : null;

  return {
    registeredDevices: Number(data?.registeredDevices || 0),
    lastBroadcast,
  };
}

export function subscribeBridgeOrders(
  onNewOrder: (order: BridgeOrder) => void,
  onUpdatedOrder: (order: BridgeOrder) => void,
  onDeletedOrder?: (payload: { _id: string }) => void,
) {
  const lastSnapshot = new Map<string, string>();

  const poll = async () => {
    let orders: BridgeOrder[];
    try {
      orders = await fetchBridgeOrders();
    } catch {
      return;
    }

    const seen = new Set<string>();
    const currentIds = new Set<string>();
    for (const order of orders) {
      const id = String(order._id);
      currentIds.add(id);
      const signature = JSON.stringify(order);
      const previous = lastSnapshot.get(id);
      if (previous === undefined) {
        // New order that was not present in the previous snapshot.
        // On the first poll there is no previous snapshot, so seed it without emitting anything.
        if (lastSnapshot.size > 0) {
          onNewOrder(order);
        }
        lastSnapshot.set(id, signature);
      } else if (previous !== signature) {
        onUpdatedOrder(order);
        lastSnapshot.set(id, signature);
      }
      seen.add(id);
    }

    if (onDeletedOrder) {
      for (const id of Array.from(lastSnapshot.keys())) {
        if (!currentIds.has(id)) {
          onDeletedOrder({ _id: id });
          lastSnapshot.delete(id);
        }
      }
    }
  };

  poll();
  const timer = window.setInterval(poll, ORDERS_POLL_INTERVAL_MS);

  return () => window.clearInterval(timer);
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
