process.env.IS_OFFLINE = "true";

import http from "http";

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
  const { default: app } = await import("../src/app.js");
  const { setMongoEnabled } = await import("../src/services/orderService.js");
  const { setPushSubscriptionsMongoEnabled } = await import("../src/services/pushSubscriptionService.js");
  const { ensureMenuLoaded } = await import("../src/services/menuService.js");

  setMongoEnabled(false);
  setPushSubscriptionsMongoEnabled(false);
  await ensureMenuLoaded();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  console.log("test server on", port);

  const helper = (path, opts) => request(port, path, opts);

  let r = await helper("/api/health");
  console.log("health", r.status, JSON.stringify(r.body));

  r = await helper("/api/menu");
  console.log("menu list status", r.status, "categories", r.body?.length);

  r = await helper("/api/shop/ordering-status");
  console.log("ordering status", r.status, JSON.stringify(r.body));

  r = await helper("/api/outlets/1/settings");
  console.log("settings get", r.status);

  r = await helper("/api/auth/login", {
    method: "POST",
    body: { email: "owner@tabio.com", password: "demo1234" },
  });
  console.log("login", r.status, "role", r.body?.user?.role);

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
  console.log("create order", r.status, r.body?._id ? `OK ${r.body.orderCode}` : JSON.stringify(r.body));
  if (r.status !== 201) {
    throw new Error("create order did not return 201");
  }
  const orderId = r.body._id;
  const orderCode = r.body.orderCode;

  r = await helper("/api/orders");
  console.log("list orders", r.status, "count", r.body?.length);

  r = await helper(`/api/orders/${orderId}`, {
    method: "PATCH",
    body: { status: "Ready" },
  });
  console.log("patch status", r.status, "status", r.body?.status);

  r = await helper(`/api/orders/${orderId}`, {
    method: "DELETE",
  });
  console.log("delete order", r.status, "ok", r.body?.ok, "code", orderCode);

  r = await helper("/api/orders");
  console.log("list orders after delete", r.status, "count", r.body?.length);

  console.log("\nALL SMOKE TESTS DONE");
  await new Promise((resolve) => server.close(resolve));
  process.exit(0);
}

main().catch((e) => {
  console.error("TEST FAIL", e);
  process.exit(1);
});