import mongoose from "mongoose";
import { handler } from "../handler.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cbk-lambda-test";

function makeEvent(path, { method = "GET", body, headers = {} } = {}) {
  return {
    version: "2.0",
    routeKey: `${method} ${path}`,
    rawPath: path,
    rawQueryString: "",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:5173",
      ...headers,
    },
    requestContext: {
      http: { method: method.toUpperCase(), path, protocol: "HTTP/1.1", sourceIp: "203.0.113.10" },
      requestId: "test-request",
    },
    isBase64Encoded: false,
    body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : null,
  };
}

async function main() {
  // Ensure DB is clean for a clean seed test
  await mongoose.connect(MONGO_URI, { bufferCommands: false });
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();

  let res = await handler(makeEvent("/api/health"));
  console.log("health:", res.statusCode, res.body);

  res = await handler(makeEvent("/api/menu"));
  const menu = JSON.parse(res.body);
  console.log("menu:", res.statusCode, "categories:", menu.length, "first:", menu[0]?.title);

  res = await handler(makeEvent("/api/shop/ordering-status"));
  console.log("ordering:", res.statusCode, res.body);

  res = await handler(
    makeEvent("/api/orders", {
      method: "POST",
      body: {
        customerName: "Lambda Person",
        phone: "1231231231",
        address: "Kolkata Lambda",
        items: [{ name: "French Fries", variant: "Regular", quantity: 1, unitPrice: 100, totalPrice: 100 }],
        total: 100,
      },
    }),
  );
  console.log("create order:", res.statusCode, res.body);

  // Menu persistence: add item, then clear initialization so a fresh warm container reseeds from DB
  process.env.ADMIN_API_KEYS = "owner:testkey";
  const authHeaders = { authorization: "Bearer testkey" };
  res = await handler(
    makeEvent("/api/menu", {
      method: "POST",
      headers: authHeaders,
      body: { categoryTitle: "LambdaCat", name: "Lambda Item", prices: { Regular: 50 } },
    }),
  );
  console.log("create menu item:", res.statusCode, res.body);

  console.log("\nALL HANDLER TESTS DONE");
  process.exit(0);
}

main().catch((e) => {
  console.error("HANDLER TEST FAIL", e);
  process.exit(1);
});
