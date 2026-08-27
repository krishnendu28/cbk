import http from "http";
import mongoose from "mongoose";
import app from "../src/app.js";
import { ensureMenuLoaded } from "../src/services/menuService.js";
import { setMongoEnabled } from "../src/services/orderService.js";
import { setPushSubscriptionsMongoEnabled } from "../src/services/pushSubscriptionService.js";

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
  setMongoEnabled(false);
  setPushSubscriptionsMongoEnabled(false);
  await ensureMenuLoaded();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  console.log("test server on", port);

  const helper = (path, opts) => request(port, path, opts);

  // Health
  let r = await helper("/api/health");
  console.log("health", r.status, JSON.stringify(r.body));

  // Menu list
  r = await helper("/api/menu");
  console.log("menu list status", r.status, "categories", r.body?.length);

  // Shop ordering status
  r = await helper("/api/shop/ordering-status");
  console.log("ordering status", r.status, JSON.stringify(r.body));

  // Outlet settings
  r = await helper("/api/outlets/1/settings");
  console.log("settings get", r.status);

  // Auth login
  r = await helper("/api/auth/login", {
    method: "POST",
    body: { email: "owner@tabio.com", password: "demo1234" },
  });
  console.log("login", r.status, "role", r.body?.user?.role);

  // Create order
  r = await helper("/api/orders", {
    method: "POST",
    headers: { origin: "http://localhost:5173" },
    body: {
      customerName: "Test Person",
      phone: "1234567890",
      address: "Test Address Kolkata",
      items: [{ name: "French Fries", variant: "Regular", quantity: 1, unitPrice: 100, totalPrice: 100 }],
      total: 100,
    },
  });
  console.log("create order", r.status, r.body?._id ? "OK" : JSON.stringify(r.body));

  // List orders
  r = await helper("/api/orders");
  console.log("list orders", r.status, "count", r.body?.length);

  console.log("\nALL SMOKE TESTS DONE");
  await new Promise((resolve) => server.close(resolve));
  process.exit(0);
}

main().catch((e) => {
  console.error("TEST FAIL", e);
  process.exit(1);
});
