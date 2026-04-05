import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const API_BASE_URL = "http://localhost:5000";
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
  const audioRef = useRef(null);

  useEffect(() => {
    if (!isOwnerLoggedIn) return undefined;

    const loadOrders = async () => {
      const response = await axios.get(`${API_BASE_URL}/api/orders`);
      setOrders(response.data);
    };

    loadOrders();

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

    return () => {
      socket.off("new_order");
      socket.off("order_updated");
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
          <img src="http://localhost:5173/logo.png" alt="Chakhna logo" className="admin-login-logo" />
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
        </div>

        <div className="header-actions">
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
