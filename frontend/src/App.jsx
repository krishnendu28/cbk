import { useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import axios from "axios";
import { ArrowRight, KeyRound, Loader2, LogIn, Mail, Phone, RefreshCw, Send, UserRound } from "lucide-react";
import Home from "./pages/Home";
import MenuPage from "./pages/MenuPage";
import OrderHistory from "./pages/OrderHistory";
import { CartProvider } from "./context/CartContext";

const USER_SESSION_KEY = "cbk_user_session";
const ADMIN_DASHBOARD_URL = import.meta.env.VITE_ADMIN_DASHBOARD_URL || "/admin";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://n6dorzvkp2.execute-api.ap-south-1.amazonaws.com";
const OTP_RESEND_SECONDS = 60;

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function App() {
  const [userSession, setUserSession] = useState(() => {
    const stored = localStorage.getItem(USER_SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [userLogin, setUserLogin] = useState({ name: "", phone: "" });
  const [loginMethod, setLoginMethod] = useState("phone");
  const [emailLogin, setEmailLogin] = useState({ name: "", email: "", otp: "" });
  const [otpStatus, setOtpStatus] = useState({ sent: false, loading: false, resendIn: 0 });
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

  const handleSendOtp = async () => {
    const email = emailLogin.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setOtpStatus((prev) => ({ ...prev, loading: true }));
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/otp/send`, { email });
      const masked = response.data?.maskedEmail || email;
      if (response.data?.devOtp) {
        toast.success(`Dev mode OTP: ${response.data.devOtp} (sent to ${masked})`);
      } else {
        toast.success(`OTP sent to ${masked}`);
      }
      setOtpStatus({ sent: true, loading: false, resendIn: OTP_RESEND_SECONDS });
      startResendCountdown();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not send OTP. Please try again.");
      setOtpStatus((prev) => ({ ...prev, loading: false }));
    }
  };

  const startResendCountdown = () => {
    const timer = setInterval(() => {
      setOtpStatus((prev) => {
        const next = Math.max(prev.resendIn - 1, 0);
        if (next === 0) clearInterval(timer);
        return { ...prev, resendIn: next };
      });
    }, 1000);
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    const email = emailLogin.email.trim().toLowerCase();
    const otp = emailLogin.otp.trim();
    if (!otp || otp.length < 4) {
      toast.error("Please enter the OTP you received.");
      return;
    }

    setOtpStatus((prev) => ({ ...prev, loading: true }));
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/otp/verify`, {
        email,
        otp,
        name: emailLogin.name.trim(),
      });
      const user = response.data?.user || {};
      saveSession({
        name: user.name || emailLogin.name.trim(),
        email: user.email || email,
        phone: "",
      });
      toast.success("Logged in successfully!");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not verify OTP. Please try again.");
      setOtpStatus((prev) => ({ ...prev, loading: false }));
    }
  };

  const resetEmailLogin = () => {
    setEmailLogin({ name: "", email: "", otp: "" });
    setOtpStatus({ sent: false, loading: false, resendIn: 0 });
  };

  const handleUserLogout = () => {
    localStorage.removeItem(USER_SESSION_KEY);
    setUserSession(null);
    setUserLogin({ name: "", phone: "" });
    resetEmailLogin();
    setActivePage("home");
  };

  if (!userSession) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--cbk-bg)] px-4 py-10">
        <Toaster position="top-center" />
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[var(--cbk-orange)]/15 blur-3xl" />
          <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[var(--cbk-crimson)]/15 blur-3xl" />
          <img
            src="/menu1.jpeg"
            alt=""
            className="absolute inset-x-0 bottom-0 h-44 w-full object-cover opacity-30"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[var(--cbk-bg)] to-transparent" />
        </div>

        <div className="relative z-10 w-full max-w-md">
          <div className="mb-6 flex items-center gap-3">
            <img
              src="/logo.jpeg"
              alt="Chakhna By Kilo logo"
              className="h-14 w-14 rounded-full border border-[var(--cbk-orange)]/40 object-cover"
            />
            <div className="text-left">
              <h1 className="font-heading text-2xl leading-none text-[var(--cbk-crimson)]">Chakhna By Kilo</h1>
              <p className="mt-1.5 text-xs text-[var(--cbk-text)]/60">Sign in to place your order</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--cbk-orange)]/15 bg-white p-6 shadow-[0_12px_40px_rgba(122,46,12,.08)] sm:p-8">
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-[var(--cbk-bg)] p-1">
              <button
                type="button"
                onClick={() => setLoginMethod("phone")}
                aria-pressed={loginMethod === "phone"}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  loginMethod === "phone"
                    ? "bg-white text-[var(--cbk-crimson)] shadow-sm"
                    : "text-[var(--cbk-text)]/60 hover:text-[var(--cbk-text)]"
                }`}
              >
                <Phone size={14} />
                Phone
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod("email")}
                aria-pressed={loginMethod === "email"}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  loginMethod === "email"
                    ? "bg-white text-[var(--cbk-crimson)] shadow-sm"
                    : "text-[var(--cbk-text)]/60 hover:text-[var(--cbk-text)]"
                }`}
              >
                <Mail size={14} />
                Email
              </button>
            </div>

            {loginMethod === "phone" && (
              <form className="space-y-4" onSubmit={handleUserLogin}>
                <label className="block text-left">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--cbk-text)]/70">Your name</span>
                  <span className="relative block">
                    <UserRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cbk-text)]/40" />
                    <input
                      type="text"
                      placeholder="Optional"
                      value={userLogin.name}
                      onChange={(event) => setUserLogin((prev) => ({ ...prev, name: event.target.value }))}
                      className="w-full rounded-xl border border-[var(--cbk-orange)]/20 bg-white py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-[var(--cbk-text)]/35 focus:border-[var(--cbk-orange)]/60 focus:ring-2 focus:ring-[var(--cbk-orange)]/10"
                    />
                  </span>
                </label>

                <label className="block text-left">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--cbk-text)]/70">Phone number</span>
                  <span className="relative block">
                    <Phone size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cbk-text)]/40" />
                    <input
                      type="tel"
                      placeholder="98XXXXXX00"
                      value={userLogin.phone}
                      onChange={(event) => setUserLogin((prev) => ({ ...prev, phone: event.target.value }))}
                      className="w-full rounded-xl border border-[var(--cbk-orange)]/20 bg-white py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-[var(--cbk-text)]/35 focus:border-[var(--cbk-orange)]/60 focus:ring-2 focus:ring-[var(--cbk-orange)]/10"
                    />
                  </span>
                </label>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--cbk-crimson)] px-4 py-3 text-sm font-semibold tracking-wide text-white transition hover:bg-[var(--cbk-crimson)]/90"
                >
                  Continue
                  <ArrowRight size={16} />
                </button>
              </form>
            )}

            {loginMethod === "email" && (
              <form className="space-y-4" onSubmit={handleVerifyOtp}>
                <label className="block text-left">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--cbk-text)]/70">Your name</span>
                  <span className="relative block">
                    <UserRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cbk-text)]/40" />
                    <input
                      type="text"
                      placeholder="Optional"
                      value={emailLogin.name}
                      onChange={(event) => setEmailLogin((prev) => ({ ...prev, name: event.target.value }))}
                      className="w-full rounded-xl border border-[var(--cbk-orange)]/20 bg-white py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-[var(--cbk-text)]/35 focus:border-[var(--cbk-orange)]/60 focus:ring-2 focus:ring-[var(--cbk-orange)]/10"
                    />
                  </span>
                </label>

                <label className="block text-left">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--cbk-text)]/70">Email address</span>
                  <span className="relative block">
                    <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cbk-text)]/40" />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={emailLogin.email}
                      onChange={(event) => {
                        setEmailLogin((prev) => ({ ...prev, email: event.target.value }));
                        if (otpStatus.sent && event.target.value !== emailLogin.email) {
                          setOtpStatus((prev) => ({ ...prev, sent: false, resendIn: 0 }));
                        }
                      }}
                      disabled={otpStatus.sent}
                      className="w-full rounded-xl border border-[var(--cbk-orange)]/20 bg-white py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-[var(--cbk-text)]/35 focus:border-[var(--cbk-orange)]/60 focus:ring-2 focus:ring-[var(--cbk-orange)]/10 disabled:opacity-60"
                    />
                  </span>
                </label>

                {otpStatus.sent ? (
                  <>
                    <div className="rounded-lg border border-[var(--cbk-orange)]/20 bg-[var(--cbk-orange)]/5 px-3 py-2.5 text-xs leading-relaxed text-[var(--cbk-text)]/70">
                      Enter the 6-digit code sent to{" "}
                      <span className="font-semibold text-[var(--cbk-crimson)]">
                        {emailLogin.email.trim().toLowerCase() || "your email"}
                      </span>
                    </div>

                    <label className="block text-left">
                      <span className="mb-1.5 block text-xs font-medium text-[var(--cbk-text)]/70">Verification code</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="000000"
                        maxLength={6}
                        value={emailLogin.otp}
                        onChange={(event) => setEmailLogin((prev) => ({ ...prev, otp: event.target.value.replace(/\D/g, "") }))}
                        className="w-full rounded-xl border border-[var(--cbk-orange)]/20 bg-white py-2.5 text-center text-lg font-semibold tracking-[0.45em] outline-none placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-[var(--cbk-text)]/25 focus:border-[var(--cbk-orange)]/60 focus:ring-2 focus:ring-[var(--cbk-orange)]/10"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={otpStatus.loading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--cbk-crimson)] px-4 py-3 text-sm font-semibold tracking-wide text-white transition hover:bg-[var(--cbk-crimson)]/90 disabled:opacity-60"
                    >
                      {otpStatus.loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                      Verify & Sign in
                    </button>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={otpStatus.loading || otpStatus.resendIn > 0}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--cbk-orange)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {otpStatus.loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                        Resend code
                      </button>
                      <span className="text-xs tabular-nums text-[var(--cbk-text)]/50">
                        {otpStatus.resendIn > 0 ? `00:${String(otpStatus.resendIn).padStart(2, "0")}` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEmailLogin((prev) => ({ ...prev, otp: "" }));
                          setOtpStatus((prev) => ({ ...prev, sent: false, resendIn: 0 }));
                        }}
                        className="text-xs font-medium text-[var(--cbk-text)]/60 hover:text-[var(--cbk-text)]"
                      >
                        Change email
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpStatus.loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--cbk-crimson)] px-4 py-3 text-sm font-semibold tracking-wide text-white transition hover:bg-[var(--cbk-crimson)]/90 disabled:opacity-60"
                  >
                    {otpStatus.loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Send verification code
                  </button>
                )}
              </form>
            )}

            <div className="mt-6 border-t border-[var(--cbk-text)]/10 pt-4">
              <button
                type="button"
                onClick={handleGuestSkip}
                className="inline-flex w-full items-center justify-center gap-1.5 text-sm font-medium text-[var(--cbk-text)]/60 transition hover:text-[var(--cbk-text)]"
              >
                <LogIn size={14} />
                Continue as guest
              </button>
            </div>

            <a
              href={ADMIN_DASHBOARD_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block text-center text-xs text-[var(--cbk-text)]/45 transition hover:text-[var(--cbk-orange)]"
            >
              Owner &amp; Admin login
            </a>
          </div>
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