import http from "http";
import mongoose from "mongoose";
import app from "../src/app.js";
import { ensureMenuLoaded, createMenuItem, updateMenuItem, deleteMenuItem, getAllMenuCategories } from "../src/services/menuService.js";
import { setMongoEnabled } from "../src/services/orderService.js";
import { setPushSubscriptionsMongoEnabled } from "../src/services/pushSubscriptionService.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cbk-lambda-test";

function request(port, path, { method = "GET", body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const data = body !== undefined ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path,
        method,
        headers: {
          "content-type": "application/json",
          ...(data ? { "content-length": Buffer.byteLength(data) } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          let json = null;
          try {
            json = raw ? JSON.parse(raw) : null;
          } catch {
            json = raw;
          }
          resolve({ status: res.statusCode, body: json });
        });
      },
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  await mongoose.connect(MONGO_URI, { bufferCommands: false });
  await mongoose.connection.dropDatabase();
  setMongoEnabled(true);
  setPushSubscriptionsMongoEnabled(true);

  await ensureMenuLoaded();
  let cats = getAllMenuCategories();
  console.log("after seed, categories:", cats.length, "sample item:", JSON.stringify(cats[0].items[0]));

  // Menu CRUD via REST (with admin auth)
  const adminKey = "owner:testkey,manager:testkey";
  process.env.ADMIN_API_KEYS = adminKey;

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const helper = (path, opts) => request(port, path, opts);
  const auth = { authorization: "Bearer testkey" };

  // Re-init app module env is read at require time; createMenuItem/update directly test service persistence instead.

  // Service-level CRUD persists to Mongo
  const created = createMenuItem({ categoryTitle: "TestCat", name: "Test Item", prices: { Regular: 99 }, available: true });
  console.log("created item id:", created.item.id);
  const updated = updateMenuItem(created.item.id, { name: "Test Item 2", prices: { Regular: 120 } });
  console.log("updated name:", updated.item.name, "price:", updated.item.prices.Regular);
  const isAvail = updateMenuItem(updated.item.id, { available: false });
  console.log("updated available:", isAvail.item.available);
  const del = deleteMenuItem(created.item.id);
  console.log("deleted:", del);

  // Wait for all pending writes to persist, then reload from DB (simulate cold start)
  const { loadMenuStateFromDb, flushMenuPersistence } = await import("../src/services/menuService.js");
  await flushMenuPersistence();
  await loadMenuStateFromDb();
  const reloaded = getAllMenuCategories();
  const cat = reloaded.find((c) => c.title === "TestCat");
  console.log("reloaded TestCat:", cat ? JSON.stringify(cat.items) : "MISSING");

  // Orders persistence
  const r = await helper("/api/orders", {
    method: "POST",
    headers: { origin: "http://localhost:5173" },
    body: {
      customerName: "Mongo Person",
      phone: "9876543210",
      address: "Kolkata",
      items: [{ name: "French Fries", variant: "Regular", quantity: 1, unitPrice: 100, totalPrice: 100 }],
      total: 100,
    },
  });
  console.log("create order (mongo):", r.status, r.body?._id ? "OK" : JSON.stringify(r.body));
  const orderId = r.body?._id;
  const upd = await helper(`/api/orders/${orderId}`, { method: "PATCH", headers: auth, body: { status: "Ready" } });
  console.log("update order status:", upd.status, upd.body?.status);

  const shop = await helper("/api/shop/ordering-status");
  console.log("shop get:", shop.status, JSON.stringify(shop.body));
  const shopUpd = await helper("/api/shop/ordering-status", { method: "PATCH", headers: auth, body: { isOrderingOpen: false } });
  console.log("shop update:", shopUpd.status, JSON.stringify(shopUpd.body));

  console.log("\nALL MONGO TESTS DONE");
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error("MONGO TEST FAIL", e);
  process.exit(1);
});
