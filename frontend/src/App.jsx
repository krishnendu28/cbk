import { useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import Home from "./pages/Home";
import OrderHistory from "./pages/OrderHistory";

const USER_SESSION_KEY = "cbk_user_session";

function App() {
  const [userSession, setUserSession] = useState(() => {
    const stored = localStorage.getItem(USER_SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [userLogin, setUserLogin] = useState({ name: "", phone: "" });
  const [activePage, setActivePage] = useState("home");

  const handleUserLogin = (event) => {
    event.preventDefault();
    if (!userLogin.name.trim() || !userLogin.phone.trim()) {
      toast.error("Please enter your name and phone number.");
      return;
    }

    const session = {
      name: userLogin.name.trim(),
      phone: userLogin.phone.trim(),
    };

    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
    setUserSession(session);
    setActivePage("home");
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
            src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1800&q=80"
            alt="Food texture"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(18,18,18,.94),rgba(18,18,18,.78),rgba(139,0,0,.45))]" />
        </div>

        <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-[rgba(255,255,255,.05)] p-6 shadow-[0_30px_60px_rgba(0,0,0,.45)] backdrop-blur-xl">
          <div className="mb-6 text-center">
            <img src="/logo.jpeg" alt="Chakhna By Kilo logo" className="mx-auto mb-3 h-20 w-20 rounded-full border border-[var(--cbk-gold)]/70 object-cover" />
            <h1 className="font-heading text-3xl">Chakhna By Kilo</h1>
            <p className="mt-1 text-sm text-white/75">Premium food delivery, crafted for your cravings.</p>
          </div>

          <form className="space-y-3" onSubmit={handleUserLogin}>
            <input
              type="text"
              placeholder="Your Name"
              value={userLogin.name}
              onChange={(event) => setUserLogin((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-sm outline-none placeholder:text-white/50 focus:border-[var(--cbk-gold)]/60"
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={userLogin.phone}
              onChange={(event) => setUserLogin((prev) => ({ ...prev, phone: event.target.value }))}
              className="w-full rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-sm outline-none placeholder:text-white/50 focus:border-[var(--cbk-gold)]/60"
            />

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-[var(--cbk-gold)] to-[#bf8d15] px-4 py-3 text-sm font-semibold tracking-wide text-black"
            >
              Continue as User
            </button>
          </form>

          <a
            href="http://localhost:5174"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block w-full text-center text-sm text-[var(--cbk-gold)] hover:underline"
          >
            Owner and Admin Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" />
      {activePage === "home" ? (
        <Home
          userSession={userSession}
          onLogout={handleUserLogout}
          onOpenHistory={() => setActivePage("history")}
        />
      ) : (
        <OrderHistory userSession={userSession} onBack={() => setActivePage("home")} />
      )}
    </>
  );
}

export default App;
