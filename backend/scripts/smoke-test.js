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
  if (Number(r.body?.deliveryCharge) !== 10) throw new Error("ordering-status should include deliveryCharge 10");
  if (Number(r.body?.etaMinutes) !== 45) throw new Error("ordering-status should include etaMinutes 45");
  if (!Array.isArray(r.body?.orderWindows)) throw new Error("ordering-status should include orderWindows");

  r = await helper("/api/outlets/1/settings");
  console.log("settings get", r.status);
  if (r.status !== 200) throw new Error("settings get failed");
  if (Number(r.body?.deliveryCharge) !== 10) throw new Error("deliveryCharge default should be 10");
  if (Number(r.body?.etaMinutes) !== 45) throw new Error("etaMinutes default should be 45");
  if (!Array.isArray(r.body?.orderWindows) || r.body.orderWindows.length < 2) throw new Error("orderWindows default missing");

  r = await helper("/api/outlets/1/settings", {
    method: "PUT",
    headers: { authorization: "Bearer dev-owner-token" },
    body: { ...r.body, deliveryCharge: 15 },
  });
  console.log("settings PUT", r.status, "deliveryCharge", r.body?.deliveryCharge);
  if (r.status !== 200 || Number(r.body?.deliveryCharge) !== 15) throw new Error("settings PUT should return deliveryCharge 15");

  r = await helper("/api/outlets/1/settings", {
    method: "PUT",
    headers: { authorization: "Bearer dev-owner-token" },
    body: { ...r.body, deliveryCharge: 10 },
  });
  console.log("settings PUT restore", r.status, "deliveryCharge", r.body?.deliveryCharge);

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
      instructions: "Extra spicy please",
      items: [{ name: "French Fries", variant: "Regular", quantity: 1, unitPrice: 100, totalPrice: 100 }],
      total: 100,
    },
  });
  console.log("create order", r.status, r.body?._id ? `OK ${r.body.orderCode}` : JSON.stringify(r.body));
  if (r.status !== 201) {
    throw new Error("create order did not return 201");
  }
  if (Number(r.body?.deliveryCharge) !== 10) throw new Error("deliveryCharge should come from settings (10)");
  if (Number(r.body?.deliveryEtaMinutes) !== 45) throw new Error("deliveryEtaMinutes should default to 45");
  if (r.body?.isFirstOrder !== true) throw new Error("first order should be flagged isFirstOrder=true");
  if (r.body?.discountRate !== 15 || Number(r.body?.discountAmount) !== 15) throw new Error("first order should get 15% off");
  if (Number(r.body?.total) !== 95) throw new Error("total should be 100 - 15 + 10 = 95");
  if (r.body?.instructions !== "Extra spicy please") throw new Error("instructions not persisted");
  const orderId = r.body._id;
  const orderCode = r.body.orderCode;

  r = await helper("/api/orders");
  console.log("list orders", r.status, "count", r.body?.length);

  r = await helper("/api/orders", {
    method: "POST",
    headers: { origin: "http://localhost:5173" },
    body: {
      customerName: "Test Person",
      phone: "1234567890",
      address: "Test Address Kolkata",
      items: [{ name: "French Fries", variant: "Regular", quantity: 2, unitPrice: 100, totalPrice: 200 }],
      total: 210,
      deliveryCharge: 10,
    },
  });
  console.log("create second order", r.status, "isFirstOrder", r.body?.isFirstOrder);
  if (r.status !== 201) throw new Error("create second order failed");
  if (r.body?.isFirstOrder !== false) throw new Error("second order should NOT be first order");
  if (Number(r.body?.total) !== 210 || Number(r.body?.discountAmount) !== 0) throw new Error("second order should have no discount and total 210");
  const secondOrderId = r.body._id;

  r = await helper(`/api/orders/${orderId}`, {
    method: "PATCH",
    body: { status: "Ready" },
  });
  console.log("patch status", r.status, "status", r.body?.status);

  r = await helper(`/api/orders/${orderId}`, {
    method: "DELETE",
  });
  console.log("delete order", r.status, "ok", r.body?.ok, "code", orderCode);

  r = await helper(`/api/orders/${secondOrderId}`, {
    method: "DELETE",
  });
  console.log("delete second order", r.status, "ok", r.body?.ok);

  r = await helper("/api/notifications/broadcast", {
    method: "POST",
    headers: { authorization: "Bearer dev-owner-token" },
    body: { message: "Flat 20% off", discountRate: 20, discountCode: "TEST20", expiresInHours: 48 },
  });
  console.log("broadcast discount", r.status, "promoRate", r.body?.promo?.discountRate, "pushType", r.body?.push?.targeted);
  if (r.status !== 201) throw new Error("broadcast discount failed");
  if (Number(r.body?.promo?.discountRate) !== 20) throw new Error("broadcast should set promo 20");

  r = await helper("/api/orders", {
    method: "POST",
    headers: { origin: "http://localhost:5173" },
    body: {
      customerName: "Promo Person",
      phone: "5555555555",
      address: "Promo Address Kolkata",
      items: [{ name: "French Fries", variant: "Regular", quantity: 1, unitPrice: 100, totalPrice: 100 }],
      total: 100,
      promoCode: "TEST20",
    },
  });
  console.log("create promo order", r.status, "discountRate", r.body?.discountRate, "promoCode", r.body?.promoCode, "total", r.body?.total);
  if (r.status !== 201) throw new Error("create promo order failed");
  if (Number(r.body?.discountRate) !== 20 || Number(r.body?.total) !== 90) throw new Error("promo order should get 20% off -> total 90");
  const promoOrderId = r.body._id;

  r = await helper("/api/outlets/1/settings", {
    method: "PUT",
    headers: { authorization: "Bearer dev-owner-token" },
    body: { ...(await (await helper("/api/outlets/1/settings")).body), promoActive: false, promoDiscountRate: 0, promoDiscountCode: "" },
  });
  console.log("settings promo reset", r.status);

  r = await helper(`/api/orders/${promoOrderId}`, {
    method: "DELETE",
  });
  console.log("delete promo order", r.status, "ok", r.body?.ok);

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