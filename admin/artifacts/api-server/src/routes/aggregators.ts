import { Router } from "express";
import { db } from "@workspace/db";
import { kotsTable, ordersTable } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";

const router = Router({ mergeParams: true });

// Mock aggregator orders store
const mockZomatoOrders = new Map<string, any>();
const mockSwiggyOrders = new Map<string, any>();

function orderNumber(outletId: number, platform: "zomato" | "swiggy") {
  const ts = Date.now().toString().slice(-6);
  return `AGG-${platform.toUpperCase()}-${outletId}-${ts}`;
}

function kotNumber(outletId: number, platform: "zomato" | "swiggy") {
  const ts = Date.now().toString().slice(-6);
  return `KOT-${platform.toUpperCase()}-${outletId}-${ts}`;
}

function toInternalItems(order: any) {
  let itemId = Date.now();
  return (order.items || []).map((item: any) => {
    const quantity = Number(item.quantity) || 1;
    const unitPrice = Number(item.price) || 0;
    const totalPrice = unitPrice * quantity;

    return {
      id: itemId++,
      menuItemId: 0,
      menuItemName: item.name || "Item",
      quantity,
      unitPrice,
      variantId: null,
      variantName: null,
      addonIds: [],
      addonNames: [],
      addonTotal: 0,
      totalPrice,
      notes: null,
      kotStatus: "pending",
    };
  });
}

async function createInternalOrderAndKot(outletId: number, platform: "zomato" | "swiggy", order: any) {
  const aggregatorOrderId = String(order.id);

  const [existing] = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.outletId, outletId),
        eq(ordersTable.aggregatorOrderId, aggregatorOrderId),
        eq(ordersTable.aggregatorPlatform, platform),
      ),
    )
    .limit(1);

  if (existing) return;

  const internalItems = toInternalItems(order);
  const subtotal = Number(order.subtotal) || 0;
  const totalAmount = Number(order.totalAmount) || subtotal;
  const taxAmount = Math.max(0, totalAmount - subtotal);

  const [createdOrder] = await db
    .insert(ordersTable)
    .values({
      outletId,
      orderNumber: orderNumber(outletId, platform),
      type: platform,
      status: "confirmed",
      tableId: null,
      customerId: null,
      customerName: order.customerName || null,
      customerPhone: order.customerPhone || null,
      items: internalItems,
      subtotal: String(subtotal.toFixed(2)),
      discountAmount: "0.00",
      taxAmount: String(taxAmount.toFixed(2)),
      totalAmount: String(totalAmount.toFixed(2)),
      paymentStatus: "pending",
      notes: `Imported from ${platform}`,
      aggregatorOrderId,
      aggregatorPlatform: platform,
    })
    .returning();

  await db.insert(kotsTable).values({
    outletId,
    orderId: createdOrder.id,
    kotNumber: kotNumber(outletId, platform),
    station: "kitchen",
    status: "pending",
    items: internalItems,
  });
}

// Generate realistic mock orders
function generateMockOrder(platform: "zomato" | "swiggy", id: string): any {
  const customers = ["Arjun Kapoor", "Neha Singh", "Ravi Verma", "Pooja Mehta", "Sanjay Patel"];
  const addresses = [
    "204, Maple Heights, Andheri West, Mumbai",
    "B-12, Palm Court, Bandra East, Mumbai",
    "701, Silver Oak, Powai, Mumbai",
    "34, Green Valley, Juhu, Mumbai",
  ];
  const items = [
    [{ name: "Butter Chicken", quantity: 1, price: 380 }, { name: "Garlic Naan", quantity: 2, price: 80 }],
    [{ name: "Chicken Biryani", quantity: 2, price: 360 }, { name: "Mango Lassi", quantity: 1, price: 120 }],
    [{ name: "Paneer Tikka", quantity: 1, price: 280 }, { name: "Dal Makhani", quantity: 1, price: 240 }, { name: "Butter Naan", quantity: 2, price: 60 }],
    [{ name: "Veg Fried Rice", quantity: 1, price: 220 }, { name: "Chicken Manchurian", quantity: 1, price: 320 }],
  ];
  const randomItems = items[Math.floor(Math.random() * items.length)];
  const subtotal = randomItems.reduce((s: number, i: any) => s + i.price * i.quantity, 0);

  return {
    id,
    platform,
    status: "new",
    customerName: customers[Math.floor(Math.random() * customers.length)],
    customerPhone: `+91 98${Math.floor(Math.random() * 90000000 + 10000000)}`,
    deliveryAddress: addresses[Math.floor(Math.random() * addresses.length)],
    items: randomItems,
    subtotal,
    totalAmount: subtotal + 40, // delivery charge
    estimatedDelivery: new Date(Date.now() + 35 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };
}

// Initialize some mock orders
(function initMockOrders() {
  const z1 = generateMockOrder("zomato", `ZOM-${Date.now()}-001`);
  const z2 = generateMockOrder("zomato", `ZOM-${Date.now()}-002`);
  z2.status = "accepted";
  z2.createdAt = new Date(Date.now() - 8 * 60 * 1000).toISOString();
  mockZomatoOrders.set(z1.id, z1);
  mockZomatoOrders.set(z2.id, z2);

  const s1 = generateMockOrder("swiggy", `SWG-${Date.now()}-001`);
  s1.createdAt = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  mockSwiggyOrders.set(s1.id, s1);
})();

// Simulate new orders coming in periodically
setInterval(() => {
  if (Math.random() > 0.7) {
    const id = `ZOM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    mockZomatoOrders.set(id, generateMockOrder("zomato", id));
  }
}, 45000);

setInterval(() => {
  if (Math.random() > 0.6) {
    const id = `SWG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    mockSwiggyOrders.set(id, generateMockOrder("swiggy", id));
  }
}, 55000);

// ZOMATO routes
// TODO: Replace this mock with real Zomato API call here - use ZOMATO_API_KEY env var
router.get("/zomato/orders", (_req, res) => {
  // TODO: Replace with: GET https://api.zomato.com/v3/restaurant/orders?status=new
  res.json(Array.from(mockZomatoOrders.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

router.post("/zomato/orders/:aggOrderId/accept", (req, res) => {
  // TODO: Replace with: POST https://api.zomato.com/v3/restaurant/orders/{id}/accept
  const order = mockZomatoOrders.get(req.params.aggOrderId);
  if (order) {
    order.status = "accepted";
    mockZomatoOrders.set(order.id, order);
  }

  const outletId = Number((req.params as { outletId?: string }).outletId);
  if (!order || !Number.isFinite(outletId) || outletId <= 0) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  createInternalOrderAndKot(outletId, "zomato", order)
    .then(() => res.json({ success: true, message: "Order accepted and pushed to kitchen" }))
    .catch((error) => res.status(500).json({ error: (error as Error).message }));
});

router.post("/zomato/orders/:aggOrderId/reject", (req, res) => {
  // TODO: Replace with: POST https://api.zomato.com/v3/restaurant/orders/{id}/reject
  const order = mockZomatoOrders.get(req.params.aggOrderId);
  if (order) { order.status = "cancelled"; mockZomatoOrders.set(order.id, order); }
  res.json({ success: true, message: "Order rejected" });
});

// SWIGGY routes
// TODO: Replace this mock with real Swiggy API call here - use SWIGGY_API_KEY env var
router.get("/swiggy/orders", (_req, res) => {
  // TODO: Replace with: GET https://partner.swiggy.com/api/v2/orders/new
  res.json(Array.from(mockSwiggyOrders.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

router.post("/swiggy/orders/:aggOrderId/accept", (req, res) => {
  // TODO: Replace with: POST https://partner.swiggy.com/api/v2/orders/{id}/accept
  const order = mockSwiggyOrders.get(req.params.aggOrderId);
  if (order) {
    order.status = "accepted";
    mockSwiggyOrders.set(order.id, order);
  }

  const outletId = Number((req.params as { outletId?: string }).outletId);
  if (!order || !Number.isFinite(outletId) || outletId <= 0) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  createInternalOrderAndKot(outletId, "swiggy", order)
    .then(() => res.json({ success: true, message: "Order accepted and pushed to kitchen" }))
    .catch((error) => res.status(500).json({ error: (error as Error).message }));
});

router.post("/swiggy/orders/:aggOrderId/reject", (req, res) => {
  // TODO: Replace with: POST https://partner.swiggy.com/api/v2/orders/{id}/reject
  const order = mockSwiggyOrders.get(req.params.aggOrderId);
  if (order) { order.status = "cancelled"; mockSwiggyOrders.set(order.id, order); }
  res.json({ success: true, message: "Order rejected" });
});

// Menu sync to aggregators
router.post("/menu-sync", (_req, res) => {
  // TODO: Replace with real Zomato + Swiggy menu push API calls
  res.json({ success: true, zomatoSynced: true, swiggySynced: true, message: "Menu synced to Zomato and Swiggy successfully" });
});

export default router;
