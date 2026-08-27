import http from "http";
import { setTimeout as sleep } from "timers/promises";
import app from "../src/app.js";

const server = http.createServer(app);
const port = 6123;

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const r = http.request(
      { host: "127.0.0.1", port, path, method, headers: payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {} },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {}
          resolve({ status: res.statusCode, json });
        });
      },
    );
    r.on("error", reject);
    if (payload) r.write(payload);
    r.end();
  });
}

server.listen(port, async () => {
  try {
    const plans = await req("GET", "/api/monthly/plans");
    console.log("plans status:", plans.status, "| title:", plans.json?.title, "| veg plans:", plans.json?.plans?.Veg?.length, "| menu days:", plans.json?.menu?.Veg?.length);

    const created = await req("POST", "/api/monthly/subscriptions", {
      name: "Test User",
      phone: "9876543210",
      address: "Flat 101, Tower A, Shapoorji",
      planType: "Veg",
      meals: 30,
    });
    console.log("create:", created.status, "| remaining:", created.json?.mealsRemaining, "| price:", created.json?.price, "| id:", created.json?._id);

    const id = created.json?._id;
    const list = await req("GET", "/api/monthly/subscriptions");
    console.log("list:", list.status, "| count:", list.json?.subscriptions?.length, "| stats:", JSON.stringify(list.json?.stats));

    const mine = await req("GET", "/api/monthly/subscriptions?phone=9876543210");
    console.log("by-phone:", mine.status, "| count:", mine.json?.subscriptions?.length);

    const redeem = await req("POST", `/api/monthly/subscriptions/${id}/redeem`, { count: 3, meal: "Dinner" });
    console.log("redeem:", redeem.status, "| redeemed:", redeem.json?.redeemed, "| remaining:", redeem.json?.subscription?.mealsRemaining, "| log len:", redeem.json?.subscription?.redemptionLog?.length);

    const patch = await req("PATCH", `/api/monthly/subscriptions/${id}`, { mealsTotal: 45 });
    console.log("patch:", patch.status, "| mealsTotal:", patch.json?.mealsTotal, "| remaining:", patch.json?.mealsRemaining);

    const del = await req("DELETE", `/api/monthly/subscriptions/${id}`);
    console.log("delete:", del.status, "| ok:", del.json?.ok);

    const bad = await req("POST", "/api/monthly/subscriptions", { name: "X", phone: "123", address: "x", planType: "Veg", meals: 999 });
    console.log("bad-plan:", bad.status, "| msg:", bad.json?.message);

    const badRedeem = await req("POST", `/api/monthly/subscriptions/${id}/redeem`, { count: 1 });
    console.log("redeem-missing:", badRedeem.status, "| msg:", badRedeem.json?.message);
  } catch (err) {
    console.error("SMOKE FAIL", err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});