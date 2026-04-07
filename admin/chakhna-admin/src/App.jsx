import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://cbk-4dmf.onrender.com";
const BRAND_LOGO_URL = import.meta.env.VITE_BRAND_LOGO_URL || `${API_BASE_URL}/logo.jpeg`;
const socket = io(API_BASE_URL);
const statuses = ["Preparing", "Ready", "Delivered"];
const OWNER_SESSION_KEY = "cbk_owner_session";

function nextStatus(currentStatus) {
  const index = statuses.indexOf(currentStatus);
  if (index < 0 || index === statuses.length - 1) return currentStatus;
  return statuses[index + 1];
}

function formatINR(value) {
  return `Rs ${value}`;
}

function App() {
  const [isOwnerLoggedIn, setIsOwnerLoggedIn] = useState(() => localStorage.getItem(OWNER_SESSION_KEY) === "1");
  const [ownerCreds, setOwnerCreds] = useState({ username: "", password: "" });
  const [orders, setOrders] = useState([]);
  const [orderingStatus, setOrderingStatus] = useState({ isOrderingOpen: true, updatedAt: null });
  const [updatingOrderingStatus, setUpdatingOrderingStatus] = useState(false);
  const [loadError, setLoadError] = useState("");
  const audioRef = useRef(null);

  useEffect(() => {
    if (!isOwnerLoggedIn) return undefined;

    const loadOrders = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/orders`);
        setOrders(Array.isArray(response.data) ? response.data : []);
        setLoadError("");
      } catch (error) {
        const status = error?.response?.status;
        setLoadError(status ? `Failed to load orders (HTTP ${status})` : "Failed to load orders");
      }
    };

    const loadOrderingStatus = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/shop/ordering-status`);
        const isOrderingOpen = Boolean(response.data?.isOrderingOpen);
        setOrderingStatus({
          isOrderingOpen,
          updatedAt: response.data?.updatedAt || null,
        });
      } catch {
        setLoadError("Failed to load shop status");
      }
    };

    loadOrders();
    loadOrderingStatus();
    const pollId = window.setInterval(loadOrders, 8000);

    socket.on("new_order", (order) => {
      setOrders((prev) => [order, ...prev]);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => undefined);
      }
    });

    socket.on("order_updated", (updated) => {
      setOrders((prev) => prev.map((order) => (order._id === updated._id ? updated : order)));
    });

    socket.on("ordering_status_updated", (status) => {
      setOrderingStatus({
        isOrderingOpen: Boolean(status?.isOrderingOpen),
        updatedAt: status?.updatedAt || null,
      });
    });

    return () => {
      window.clearInterval(pollId);
      socket.off("new_order");
      socket.off("order_updated");
      socket.off("ordering_status_updated");
    };
  }, [isOwnerLoggedIn]);

  const activeCount = useMemo(
    () => orders.filter((order) => order.status !== "Delivered").length,
    [orders],
  );

  const kitchenOrders = useMemo(
    () => orders.filter((order) => order.status !== "Delivered"),
    [orders],
  );

  const handleOwnerLogin = (event) => {
    event.preventDefault();
    if (ownerCreds.username.trim().toLowerCase() !== "owner" || ownerCreds.password !== "chakhna123") {
      window.alert("Invalid owner credentials. Use owner / chakhna123");
      return;
    }
    localStorage.setItem(OWNER_SESSION_KEY, "1");
    setIsOwnerLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem(OWNER_SESSION_KEY);
    setIsOwnerLoggedIn(false);
    setOwnerCreds({ username: "", password: "" });
  };

  const toggleOrderingStatus = async () => {
    const nextStatus = !orderingStatus.isOrderingOpen;
    setUpdatingOrderingStatus(true);
    try {
      const response = await axios.patch(`${API_BASE_URL}/api/shop/ordering-status`, {
        isOrderingOpen: nextStatus,
      });

      setOrderingStatus({
        isOrderingOpen: Boolean(response.data?.isOrderingOpen),
        updatedAt: response.data?.updatedAt || null,
      });
    } catch {
      window.alert("Unable to update ordering status. Please try again.");
    } finally {
      setUpdatingOrderingStatus(false);
    }
  };

  const updateStatus = async (order) => {
    const next = nextStatus(order.status);
    if (next === order.status) return;

    const response = await axios.patch(`${API_BASE_URL}/api/orders/${order._id}`, {
      status: next,
    });

    setOrders((prev) => prev.map((row) => (row._id === order._id ? response.data : row)));
  };

  if (!isOwnerLoggedIn) {
    return (
      <div className="admin-login-screen">
        <div className="admin-login-card">
          <img src={BRAND_LOGO_URL} alt="Chakhna logo" className="admin-login-logo" />
          <h1>Owner Login</h1>
          <p>Sign in to manage live orders and kitchen tickets.</p>
          <form className="admin-login-form" onSubmit={handleOwnerLogin}>
            <input
              type="text"
              placeholder="Owner Username"
              value={ownerCreds.username}
              onChange={(event) => setOwnerCreds((prev) => ({ ...prev, username: event.target.value }))}
            />
            <input
              type="password"
              placeholder="Password"
              value={ownerCreds.password}
              onChange={(event) => setOwnerCreds((prev) => ({ ...prev, password: event.target.value }))}
            />
            <button type="submit">Login as Owner</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />

      <header className="admin-header">
        <div>
          <h1>Chakhna Admin Dashboard</h1>
          <p>Live orders from user app + real-time kitchen feed</p>
          {loadError ? <p style={{ color: "#ff9b9b", marginTop: 6 }}>{loadError}</p> : null}
        </div>

        <div className="header-actions">
          <button
            className={`ordering-toggle ${orderingStatus.isOrderingOpen ? "open" : "closed"}`}
            onClick={toggleOrderingStatus}
            disabled={updatingOrderingStatus}
          >
            <span className="toggle-dot" />
            {updatingOrderingStatus
              ? "Updating..."
              : orderingStatus.isOrderingOpen
                ? "Ordering Open"
                : "Ordering Closed"}
          </button>
          <button onClick={logout}>Logout</button>
          <span>{activeCount} active orders</span>
        </div>
      </header>

      <div className="view-columns">
        <section>
          <h2 className="section-title">Admin Orders</h2>
          <div className="order-grid">
            {orders.length === 0 && <p className="empty">No orders yet.</p>}

            {orders.map((order) => (
              <article key={order._id} className="order-card">
                <div className="order-top">
                  <h3>Order #{order._id.slice(-6)}</h3>
                  <span className={`status ${order.status.toLowerCase()}`}>{order.status}</span>
                </div>

                <div className="customer">
                  <p><strong>Name:</strong> {order.customerName}</p>
                  <p><strong>Phone:</strong> {order.phone}</p>
                  <p><strong>Address:</strong> {order.address}</p>
                  <p><strong>Time:</strong> {new Date(order.createdAt).toLocaleString()}</p>
                </div>

                <div className="items">
                  {order.items.map((item, idx) => (
                    <p key={`${item.name}-${idx}`}>
                      {item.name} x {item.quantity} ({item.variant}) - {formatINR(item.totalPrice)}
                    </p>
                  ))}
                </div>

                <p className="total">Total: {formatINR(order.total)}</p>
                <button
                  className="status-btn"
                  onClick={() => updateStatus(order)}
                  disabled={order.status === "Delivered"}
                >
                  {order.status === "Delivered" ? "Completed" : `Mark as ${nextStatus(order.status)}`}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2 className="section-title">Kitchen Side</h2>
          <div className="order-grid kitchen">
            {kitchenOrders.length === 0 && <p className="empty">No active kitchen tickets.</p>}
            {kitchenOrders.map((order) => (
              <article key={`kitchen-${order._id}`} className="order-card">
                <div className="order-top">
                  <h3>#{order._id.slice(-6)}</h3>
                  <span className={`status ${order.status.toLowerCase()}`}>{order.status}</span>
                </div>
                <div className="items">
                  {order.items.map((item, idx) => (
                    <p key={`${item.name}-${idx}`} className="kitchen-item">
                      {item.name} x {item.quantity}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
