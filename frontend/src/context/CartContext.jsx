import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  Building2,
  ChevronRight,
  Landmark,
  MapPinned,
  MessageSquareText,
  ShoppingCart,
  Tag,
  X,
} from "lucide-react";
import { menuCategories as fallbackMenuCategories } from "../data/menuData";
import { CartContext } from "./cart-context";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://n6dorzvkp2.execute-api.ap-south-1.amazonaws.com";
const POLL_INTERVAL_MS = 30000;
const FIRST_ORDER_KEY = "cbk_ordered_before";
const FAVORITES_KEY = "cbk_favorites";
const PROMO_CODE_KEY = "cbk_promo_code";

const defaultSettings = {
  deliveryCharge: 10,
  etaMinutes: 45,
  orderWindows: [
    { name: "Lunch", start: "12:30", end: "17:30" },
    { name: "Dinner", start: "18:30", end: "23:30" },
  ],
  discountEnabled: false,
  discountRate: 0,
  firstOrderDiscountEnabled: true,
  firstOrderDiscountRate: 15,
  promoActive: false,
  promoDiscountRate: 0,
  promoDiscountCode: "",
  promoExpiresAt: null,
};

function formatINR(value) {
  return `Rs ${value}`;
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

export function CartProvider({ children, userSession }) {
  const [menuCategories, setMenuCategories] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [isOrderingOpen, setIsOrderingOpen] = useState(true);
  const [variantSelections, setVariantSelections] = useState({});
  const [settings, setSettings] = useState(defaultSettings);
  const [promoInput, setPromoInput] = useState(() => localStorage.getItem(PROMO_CODE_KEY) || "");
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [customer, setCustomer] = useState({
    name: userSession?.name || "",
    phone: userSession?.phone || "",
    addressLine: "",
    landmark: "",
    instructions: "",
  });

  const cartButtonRef = useRef(null);

  useEffect(() => {
    setCustomer((prev) => ({
      ...prev,
      name: userSession?.name || "",
      phone: userSession?.phone || "",
    }));
  }, [userSession]);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    async function loadMenu() {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/menu`);
        const categories = Array.isArray(response.data) && response.data.length ? response.data : fallbackMenuCategories;
        setMenuCategories(categories);
      } catch {
        setMenuCategories(fallbackMenuCategories);
      }
    }

    async function loadShopState() {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/shop/ordering-status`);
        const data = response.data || {};
        setIsOrderingOpen(Boolean(data.isOrderingOpen));
        setSettings((prev) => ({
          ...prev,
          deliveryCharge: Number(data.deliveryCharge) >= 0 ? Number(data.deliveryCharge) : prev.deliveryCharge,
          etaMinutes: Number(data.etaMinutes) || prev.etaMinutes,
          orderWindows:
            Array.isArray(data.orderWindows) && data.orderWindows.length > 0 ? data.orderWindows : prev.orderWindows,
          firstOrderDiscountEnabled: Boolean(data.firstOrderDiscountEnabled),
          firstOrderDiscountRate: Number(data.firstOrderDiscountRate) || prev.firstOrderDiscountRate,
        }));
      } catch {
        // Keep defaults / current state on transient failures.
      }
    }

    async function loadOutletSettings() {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/outlets/1/settings`);
        const data = response.data || {};
        setSettings((prev) => ({
          ...prev,
          deliveryCharge: Number(data.deliveryCharge) >= 0 ? Number(data.deliveryCharge) : prev.deliveryCharge,
          etaMinutes: Number(data.etaMinutes) || prev.etaMinutes,
          orderWindows: Array.isArray(data.orderWindows) && data.orderWindows.length > 0 ? data.orderWindows : prev.orderWindows,
          discountEnabled: Boolean(data.discountEnabled),
          discountRate: Number(data.discountRate) || 0,
          firstOrderDiscountEnabled: Boolean(data.firstOrderDiscountEnabled),
          firstOrderDiscountRate: Number(data.firstOrderDiscountRate) || prev.firstOrderDiscountRate,
          promoActive: Boolean(data.promoActive),
          promoDiscountRate: Number(data.promoDiscountRate) || 0,
          promoDiscountCode: String(data.promoDiscountCode || "").trim(),
          promoExpiresAt: data.promoExpiresAt || null,
        }));
      } catch {
        // Ignore transient failures.
      }
    }

    loadMenu();
    loadShopState();
    loadOutletSettings();

    const pollTimer = window.setInterval(() => {
      loadMenu();
      loadShopState();
      loadOutletSettings();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(pollTimer);
  }, []);

  const phoneDigits = normalizePhone(customer.phone);
  const firstOrderEligible = useMemo(() => {
    if (!phoneDigits || !settings.firstOrderDiscountEnabled) return false;
    return !localStorage.getItem(`${FIRST_ORDER_KEY}:${phoneDigits.slice(-10)}`);
  }, [phoneDigits, settings.firstOrderDiscountEnabled]);

  const promoNotExpired = useMemo(() => {
    if (!settings.promoExpiresAt) return true;
    return Date.now() < new Date(settings.promoExpiresAt).getTime();
  }, [settings.promoExpiresAt]);

  const appliedPromoCode = useMemo(() => {
    if (!settings.promoActive || Number(settings.promoDiscountRate || 0) <= 0 || !promoNotExpired) return "";
    const required = String(settings.promoDiscountCode || "").trim();
    if (!required) return "";
    return promoInput.trim().toUpperCase() === required.toUpperCase() ? required : "";
  }, [settings.promoActive, settings.promoDiscountRate, settings.promoDiscountCode, promoInput, promoNotExpired]);

  const discountInfo = useMemo(() => {
    let rate = 0;
    let origin = null;

    if (settings.promoActive && Number(settings.promoDiscountRate || 0) > 0 && promoNotExpired) {
      const required = String(settings.promoDiscountCode || "").trim();
      if (!required || promoInput.trim().toUpperCase() === required.toUpperCase()) {
        rate = Number(settings.promoDiscountRate);
        origin = "promo";
      }
    }

    if (origin === null && firstOrderEligible) {
      rate = Number(settings.firstOrderDiscountRate) || 0;
      origin = "first";
    }

    if (origin === null && settings.discountEnabled) {
      rate = Number(settings.discountRate) || 0;
      origin = "general";
    }

    return { rate, origin };
  }, [settings, firstOrderEligible, promoInput, promoNotExpired]);

  const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.totalPrice, 0), [cartItems]);
  const deliveryCharge = cartItems.length > 0 ? Number(settings.deliveryCharge) : 0;
  const discountAmount = useMemo(() => Math.round((subtotal * discountInfo.rate) / 100), [subtotal, discountInfo.rate]);
  const grandTotal = Math.max(0, subtotal - discountAmount + deliveryCharge);
  const showMobileCartActions = cartItems.length > 0;

  const toggleFavorite = (itemName) => {
    setFavorites((prev) => (prev.includes(itemName) ? prev.filter((name) => name !== itemName) : [...prev, itemName]));
  };

  const isFavorite = (itemName) => favorites.includes(itemName);

  const handleVariantChange = (itemName, variant) => {
    setVariantSelections((prev) => ({ ...prev, [itemName]: variant }));
  };

  const addToCart = (item) => {
    if (!isOrderingOpen) {
      toast.error("Ordering is closed right now.");
      return;
    }

    const variants = Object.entries(item.prices || {});
    if (variants.length === 0) return;

    const selectedVariant = variantSelections[item.name] || variants[0][0];
    const selectedPrice = item.prices[selectedVariant];

    setCartItems((prev) => {
      const existing = prev.find((cartItem) => cartItem.name === item.name && cartItem.variant === selectedVariant);
      if (existing) {
        return prev.map((cartItem) =>
          cartItem.id === existing.id
            ? {
                ...cartItem,
                quantity: cartItem.quantity + 1,
                totalPrice: (cartItem.quantity + 1) * cartItem.unitPrice,
              }
            : cartItem,
        );
      }

      return [
        ...prev,
        {
          id: `${item.name}-${selectedVariant}`,
          name: item.name,
          variant: selectedVariant,
          quantity: 1,
          unitPrice: selectedPrice,
          totalPrice: selectedPrice,
        },
      ];
    });

    setCartOpen(true);
    toast.success(`${item.name} added to cart`);
  };

  const updateQuantity = (id, delta) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: Math.max(0, item.quantity + delta),
                totalPrice: Math.max(0, item.quantity + delta) * item.unitPrice,
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setCustomer((prev) => ({ ...prev, addressLine: "", landmark: "", instructions: "" }));
  };

  const placeOrder = async () => {
    if (!isOrderingOpen) {
      toast.error("Ordering is currently closed. Please come back when the shop reopens.");
      return;
    }

    if (!phoneDigits || phoneDigits.length < 7) {
      toast.error("Please enter your phone number so we can deliver your order.");
      return;
    }
    if (!customer.addressLine.trim()) {
      toast.error("Please enter your flat/house number and room.");
      return;
    }
    if (cartItems.length === 0) {
      toast.error("Cart is empty.");
      return;
    }

    setPlacingOrder(true);
    try {
      const finalPromoCode =
        appliedPromoCode || (settings.promoActive && !String(settings.promoDiscountCode || "").trim() ? "" : promoInput.trim());

      const payload = {
        customerName: customer.name.trim() || "Guest",
        phone: normalizePhone(customer.phone),
        address: `Flat/House ${customer.addressLine.trim()}${customer.landmark.trim() ? `, Landmark: ${customer.landmark.trim()}` : ""}`,
        instructions: customer.instructions.trim(),
        items: cartItems,
        subtotal,
        discountEnabled: discountInfo.rate > 0,
        discountRate: discountInfo.rate,
        discountAmount,
        deliveryCharge,
        total: grandTotal,
        promoCode: finalPromoCode,
      };

      const response = await axios.post(`${API_BASE_URL}/api/orders`, payload);

      localStorage.setItem(`${FIRST_ORDER_KEY}:${phoneDigits.slice(-10)}`, "1");
      if (settings.promoActive && !appliedPromoCode && finalPromoCode) {
        localStorage.setItem(PROMO_CODE_KEY, finalPromoCode);
      }
      if (response.data?.deliveryEtaMinutes) {
        toast.success(`Order placed! Estimated delivery ~${response.data.deliveryEtaMinutes} min`);
      } else {
        toast.success("Your order is being prepared");
      }

      setCartItems([]);
      setCustomer((prev) => ({ ...prev, addressLine: "", landmark: "", instructions: "" }));
      setCartOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Order failed. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        menuCategories,
        cartItems,
        cartOpen,
        setCartOpen,
        placingOrder,
        isOrderingOpen,
        variantSelections,
        handleVariantChange,
        favorites,
        toggleFavorite,
        isFavorite,
        addToCart,
        updateQuantity,
        clearCart,
        placeOrder,
        customer,
        setCustomer,
        promoInput,
        setPromoInput,
        subtotal,
        deliveryCharge,
        discountInfo,
        discountAmount,
        grandTotal,
        firstOrderEligible,
        settings,
        showMobileCartActions,
      }}
    >
      {children}

      <Motion.button
        ref={cartButtonRef}
        type="button"
        onClick={() => setCartOpen(true)}
        disabled={!isOrderingOpen}
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        className={[
          "fixed right-4 z-50 rounded-full border border-[var(--cbk-orange)]/40 bg-[var(--cbk-crimson)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(194,31,46,.5)] disabled:cursor-not-allowed disabled:opacity-50 md:bottom-6",
          showMobileCartActions ? "bottom-20 inline-flex" : "hidden md:inline-flex md:bottom-6",
        ].join(" ")}
      >
        <span className="inline-flex items-center gap-2">
          <ShoppingCart size={16} />
          Checkout Cart ({cartItems.length})
        </span>
      </Motion.button>

      <AnimatePresence>
        {cartOpen && (
          <>
            <Motion.button
              type="button"
              aria-label="Close cart"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCartOpen(false)}
              className="fixed inset-0 z-40 bg-black/60"
            />

            <Motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 220, damping: 28 }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-[var(--cbk-cream)] p-4 shadow-[0_0_40px_rgba(0,0,0,.3)]"
            >
              <div className="mb-4 flex items-center justify-between rounded-xl border border-[var(--cbk-orange)]/20 bg-white px-3 py-2">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={18} className="text-[var(--cbk-orange)]" />
                  <h3 className="font-heading text-2xl">Your Cart</h3>
                </div>
                <button type="button" onClick={() => setCartOpen(false)} className="inline-flex items-center gap-1 rounded-lg bg-[var(--cbk-bg)] px-3 py-1.5 text-sm text-[var(--cbk-text)]">
                  <X size={14} />
                  Close
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {cartItems.length === 0 && (
                  <p className="rounded-xl border border-[var(--cbk-orange)]/15 bg-white p-4 text-sm text-[var(--cbk-text)]">
                    Your cart is empty. Head to the menu and add your favourites.
                  </p>
                )}
                {cartItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-[var(--cbk-orange)]/15 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-[var(--cbk-crimson)]">{item.variant}</p>
                      </div>
                      <p className="text-sm font-semibold text-[var(--cbk-orange)]">{formatINR(item.totalPrice)}</p>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button type="button" onClick={() => updateQuantity(item.id, -1)} className="h-7 w-7 rounded-md bg-[var(--cbk-bg)] font-bold text-[var(--cbk-crimson)]">
                        -
                      </button>
                      <span className="text-sm">{item.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(item.id, 1)} className="h-7 w-7 rounded-md bg-[var(--cbk-bg)] font-bold text-[var(--cbk-crimson)]">
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2 border-t border-[var(--cbk-orange)]/15 pt-4">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={customer.name}
                    onChange={(event) => setCustomer((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Your Name (optional)"
                    className="w-full rounded-lg border border-[var(--cbk-orange)]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--cbk-orange)]/60"
                  />
                  <input
                    type="tel"
                    value={customer.phone}
                    onChange={(event) => setCustomer((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="Phone Number"
                    className="w-full rounded-lg border border-[var(--cbk-orange)]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--cbk-orange)]/60"
                  />
                </div>

                <label className="space-y-1">
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--cbk-text)]">
                    <Building2 size={13} />
                    Flat / House No &amp; Room
                  </span>
                  <input
                    type="text"
                    value={customer.addressLine}
                    onChange={(event) => setCustomer((prev) => ({ ...prev, addressLine: event.target.value }))}
                    placeholder="e.g. Flat 5B, Room 402"
                    className="w-full rounded-lg border border-[var(--cbk-orange)]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--cbk-orange)]/60"
                  />
                </label>

                <label className="space-y-1">
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--cbk-text)]">
                    <Landmark size={13} />
                    Landmark (optional)
                  </span>
                  <input
                    type="text"
                    value={customer.landmark}
                    onChange={(event) => setCustomer((prev) => ({ ...prev, landmark: event.target.value }))}
                    placeholder="e.g. Opposite Technocity Gate"
                    className="w-full rounded-lg border border-[var(--cbk-orange)]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--cbk-orange)]/60"
                  />
                </label>

                <label className="space-y-1">
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--cbk-text)]">
                    <MessageSquareText size={13} />
                    Instructions for Restaurant (optional)
                  </span>
                  <textarea
                    value={customer.instructions}
                    onChange={(event) => setCustomer((prev) => ({ ...prev, instructions: event.target.value }))}
                    placeholder="e.g. Less spicy, no onion for curry..."
                    rows={2}
                    className="w-full resize-none rounded-lg border border-[var(--cbk-orange)]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--cbk-orange)]/60"
                  />
                </label>

                <div className="flex items-center gap-2 rounded-lg border border-[var(--cbk-orange)]/20 bg-white px-3 py-2">
                  <Tag size={14} className="text-[var(--cbk-orange)]" />
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(event) => setPromoInput(event.target.value)}
                    placeholder="Promo code (if any)"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>

                <div className="rounded-lg border border-[var(--cbk-orange)]/15 bg-white p-3 text-sm text-[var(--cbk-text)]">
                  <p className="flex justify-between"><span>Subtotal</span><span>{formatINR(subtotal)}</span></p>
                  {discountInfo.rate > 0 && (
                    <p className="flex justify-between font-medium text-[var(--cbk-crimson)]">
                      <span>
                        {discountInfo.origin === "first" && "Welcome discount (first order)"}
                        {discountInfo.origin === "promo" && `Promo discount (${discountInfo.rate}%)`}
                        {discountInfo.origin === "general" && `Discount (${discountInfo.rate}%)`}
                      </span>
                      <span>-{formatINR(discountAmount)}</span>
                    </p>
                  )}
                  {firstOrderEligible && discountInfo.origin !== "first" && discountInfo.origin !== "promo" && (
                    <p className="text-xs font-medium text-[var(--cbk-orange)]">
                      First order offer: {settings.firstOrderDiscountRate}% off auto-applied
                    </p>
                  )}
                  <p className="flex justify-between"><span>Delivery ({settings.etaMinutes} min)</span><span>{formatINR(deliveryCharge)}</span></p>
                  <p className="mt-1 flex justify-between font-semibold text-[var(--cbk-crimson)]"><span>Payable</span><span>{formatINR(grandTotal)}</span></p>
                </div>

                <button
                  type="button"
                  disabled={placingOrder || !isOrderingOpen}
                  onClick={placeOrder}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--cbk-crimson)] to-[var(--cbk-orange)] px-4 py-3 font-semibold text-white disabled:opacity-70"
                >
                  <MapPinned size={16} />
                  {placingOrder ? "Processing Checkout..." : isOrderingOpen ? `Place Order (${formatINR(grandTotal)})` : "Ordering Closed"}
                  {!placingOrder && <ChevronRight size={16} />}
                </button>
              </div>
            </Motion.aside>
          </>
        )}
      </AnimatePresence>
    </CartContext.Provider>
  );
}