import { useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { LogIn, UserRound } from "lucide-react";
import Home from "./pages/Home";
import MenuPage from "./pages/MenuPage";
import OrderHistory from "./pages/OrderHistory";
import { CartProvider } from "./context/CartContext";

const USER_SESSION_KEY = "cbk_user_session";
const ADMIN_DASHBOARD_URL = import.meta.env.VITE_ADMIN_DASHBOARD_URL || "/admin";

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function App() {
  const [userSession, setUserSession] = useState(() => {
    const stored = localStorage.getItem(USER_SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [userLogin, setUserLogin] = useState({ name: "", phone: "" });
  const [activePage, setActivePage] = useState("home");

  const saveSession = (session) => {
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
    setUserSession(session);
    setActivePage("home");
  };

  const handleUserLogin = (event) => {
    event.preventDefault();
    if (!normalizePhone(userLogin.phone) || normalizePhone(userLogin.phone).length < 7) {
      toast.error("Please enter a valid phone number.");
      return;
    }

    saveSession({
      name: userLogin.name.trim(),
      phone: userLogin.phone.trim(),
    });
  };

  const handleGuestSkip = () => {
    saveSession({ guest: true, name: "", phone: "" });
  };

  const handleUserLogout = () => {
    localStorage.removeItem(USER_SESSION_KEY);
    setUserSession(null);
    setUserLogin({ name: "", phone: "" });
    setActivePage("home");
  };

  if (!userSession) {
    return (
      <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[var(--cbk-bg)] px-4">
        <Toaster position="top-center" />
        <div className="absolute inset-0">
          <img
            src="/menu4.jpeg"
            alt="Food spread"
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.src = "/menu1.jpeg";
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(255,247,237,.92),rgba(255,241,220,.8))]" />
        </div>

        <div className="relative z-10 w-full max-w-md rounded-3xl border border-[var(--cbk-orange)]/20 bg-white/90 p-6 shadow-[0_30px_60px_rgba(122,46,12,.25)] backdrop-blur-xl">
          <div className="mb-6 text-center">
            <img src="/logo.jpeg" alt="Chakhna By Kilo logo" className="mx-auto mb-3 h-20 w-20 rounded-full border border-[var(--cbk-orange)]/50 object-cover" />
            <h1 className="font-heading text-3xl text-[var(--cbk-crimson)]">Chakhna By Kilo</h1>
            <p className="mt-1 text-sm text-[var(--cbk-text)]/70">Premium food delivery, crafted for your cravings.</p>
          </div>

          <form className="space-y-3" onSubmit={handleUserLogin}>
            <input
              type="text"
              placeholder="Your Name (optional)"
              value={userLogin.name}
              onChange={(event) => setUserLogin((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-xl border border-[var(--cbk-orange)]/25 bg-white px-4 py-3 text-sm outline-none placeholder:text-[var(--cbk-text)]/40 focus:border-[var(--cbk-orange)]/60"
            />
            <input
              type="tel"
              placeholder="Phone Number *"
              value={userLogin.phone}
              onChange={(event) => setUserLogin((prev) => ({ ...prev, phone: event.target.value }))}
              className="w-full rounded-xl border border-[var(--cbk-orange)]/25 bg-white px-4 py-3 text-sm outline-none placeholder:text-[var(--cbk-text)]/40 focus:border-[var(--cbk-orange)]/60"
            />

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--cbk-crimson)] to-[var(--cbk-orange)] px-4 py-3 text-sm font-semibold tracking-wide text-white"
            >
              <LogIn size={16} />
              Continue as User
            </button>
          </form>

          <button
            type="button"
            onClick={handleGuestSkip}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--cbk-orange)]/30 bg-white px-4 py-3 text-sm font-semibold text-[var(--cbk-text)]"
          >
            <UserRound size={16} />
            Skip — browse without login
          </button>

          <a
            href={ADMIN_DASHBOARD_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block w-full text-center text-sm text-[var(--cbk-orange)] hover:underline"
          >
            Owner and Admin Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <CartProvider userSession={userSession}>
      <Toaster position="top-center" />
      {activePage === "home" && (
        <Home
          userSession={userSession}
          onLogout={handleUserLogout}
          onOpenMenu={() => setActivePage("menu")}
          onOpenHistory={() => setActivePage("history")}
        />
      )}
      {activePage === "menu" && (
        <MenuPage onBack={() => setActivePage("home")} />
      )}
      {activePage === "history" && (
        <OrderHistory userSession={userSession} onBack={() => setActivePage("home")} />
      )}
    </CartProvider>
  );
}

export default App;