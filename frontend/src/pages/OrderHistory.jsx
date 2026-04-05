import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { motion } from "framer-motion";
import { ArrowLeft, Clock3, PackageCheck, UtensilsCrossed } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://cbk-4dmf.onrender.com";
const socket = io(API_BASE_URL, { autoConnect: true });
const orderSteps = ["Preparing", "Ready", "Delivered"];

function formatINR(value) {
  return `Rs ${value}`;
}

function formatTime(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "-";
  }
}

function getStatusClass(status) {
  if (status === "Delivered") return "bg-emerald-500/20 text-emerald-300 border-emerald-400/35";
  if (status === "Ready") return "bg-amber-500/20 text-amber-300 border-amber-400/35";
  return "bg-sky-500/20 text-sky-300 border-sky-400/35";
}

function OrderHistory({ userSession, onBack }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const userPhone = String(userSession?.phone || "").trim();

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/orders`);
        const data = Array.isArray(response.data) ? response.data : [];
        const filtered = data
          .filter((order) => String(order.phone || "").trim() === userPhone)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(filtered);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }

    loadOrders();

    const onOrderCreated = (order) => {
      if (String(order?.phone || "").trim() !== userPhone) return;
      setOrders((prev) => [order, ...prev.filter((item) => item._id !== order._id)]);
    };

    const onOrderUpdated = (order) => {
      if (String(order?.phone || "").trim() !== userPhone) return;
      setOrders((prev) => prev.map((item) => (item._id === order._id ? order : item)));
    };

    const onOrderDeleted = ({ _id }) => {
      setOrders((prev) => prev.filter((item) => item._id !== _id));
    };

    socket.on("new_order", onOrderCreated);
    socket.on("order_updated", onOrderUpdated);
    socket.on("order_deleted", onOrderDeleted);

    return () => {
      socket.off("new_order", onOrderCreated);
      socket.off("order_updated", onOrderUpdated);
      socket.off("order_deleted", onOrderDeleted);
    };
  }, [userPhone]);

  const hasOrders = useMemo(() => orders.length > 0, [orders]);

  return (
    <div className="min-h-screen bg-[var(--cbk-bg)] px-4 pb-8 pt-5 text-[var(--cbk-text)] sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur">
          <div>
            <h1 className="font-heading text-3xl">Order History</h1>
            <p className="mt-1 text-sm text-white/70">Track live status updates from kitchen to doorstep.</p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm"
          >
            <ArrowLeft size={16} />
            Back to Menu
          </button>
        </div>

        {loading && <p className="text-sm text-white/70">Loading your orders...</p>}

        {!loading && !hasOrders && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 text-center">
            <Clock3 size={28} className="mx-auto mb-3 text-[var(--cbk-gold)]" />
            <h2 className="font-heading text-2xl">No orders yet</h2>
            <p className="mt-2 text-sm text-white/70">Place your first order to see live progress here.</p>
          </div>
        )}

        <div className="space-y-4">
          {orders.map((order) => {
            const activeIndex = Math.max(0, orderSteps.indexOf(order.status || "Preparing"));

            return (
              <motion.article
                key={order._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_10px_26px_rgba(0,0,0,.3)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-white/60">Order ID</p>
                    <p className="text-sm font-semibold">{String(order._id).slice(0, 10)}...</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60">Placed At</p>
                    <p className="text-sm">{formatTime(order.createdAt)}</p>
                  </div>
                  <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(order.status)}`}>
                    {order.status || "Preparing"}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {orderSteps.map((step, index) => {
                    const done = index <= activeIndex;
                    return (
                      <div key={step} className="flex items-center gap-2 rounded-lg bg-black/20 px-2 py-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${done ? "bg-[var(--cbk-gold)]" : "bg-white/20"}`} />
                        <span className={`text-xs ${done ? "text-white" : "text-white/55"}`}>{step}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-black/15 p-3">
                  <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[var(--cbk-gold)]">
                    <UtensilsCrossed size={14} />
                    Items
                  </div>
                  <div className="space-y-1 text-sm text-white/85">
                    {(order.items || []).map((item, idx) => (
                      <p key={`${order._id}-${item.name}-${idx}`}>
                        {item.name} ({item.variant}) x {item.quantity}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <p className="text-white/70">Delivery: {order.address}</p>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 font-semibold text-[var(--cbk-gold)]">
                    <PackageCheck size={14} />
                    Total {formatINR(order.total || 0)}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default OrderHistory;
