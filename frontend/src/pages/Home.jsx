import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  Building2,
  ChevronRight,
  House,
  Landmark,
  LogOut,
  MapPinned,
  ReceiptText,
  ShoppingCart,
  UtensilsCrossed,
  X,
} from "lucide-react";
import CategoryBar from "../components/CategoryBar";
import MenuCard from "../components/MenuCard";
import { menuCategories as fallbackMenuCategories } from "../data/menuData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://cbk-4dmf.onrender.com";
const socket = io(API_BASE_URL, { autoConnect: true });

const heroSlides = [
  {
    title: "Chef Signature Platters",
    image: "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&cs=tinysrgb&w=1800&h=1200&fit=crop",
  },
  {
    title: "Smoky Tandoor Nights",
    image: "https://images.pexels.com/photos/1624487/pexels-photo-1624487.jpeg?auto=compress&cs=tinysrgb&w=1800&h=1200&fit=crop",
  },
  {
    title: "Royal Biryani Moments",
    image: "https://images.pexels.com/photos/9609838/pexels-photo-9609838.jpeg?auto=compress&cs=tinysrgb&w=1800&h=1200&fit=crop",
  },
  {
    title: "Curated Street Classics",
    image: "https://images.pexels.com/photos/9609850/pexels-photo-9609850.jpeg?auto=compress&cs=tinysrgb&w=1800&h=1200&fit=crop",
  },
];

function formatINR(value) {
  return `Rs ${value}`;
}

function buildDeliveryAddress(customer) {
  return `Flat: ${customer.flatNo}, Room/Floor: ${customer.roomOrFloor}, Landmark: ${customer.landmark}`;
}

function Home({ userSession, onLogout, onOpenHistory }) {
  const [menuCategories, setMenuCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [variantSelections, setVariantSelections] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [flyItem, setFlyItem] = useState(null);
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);
  const [customer, setCustomer] = useState({
    customerName: userSession?.name || "",
    phone: userSession?.phone || "",
    flatNo: "",
    roomOrFloor: "",
    landmark: "",
  });

  const cartButtonRef = useRef(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 3500);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    setCustomer((prev) => ({
      ...prev,
      customerName: userSession?.name || "",
      phone: userSession?.phone || "",
    }));
  }, [userSession]);

  useEffect(() => {
    async function loadMenu() {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/menu`);
        const categories = Array.isArray(response.data) && response.data.length ? response.data : fallbackMenuCategories;
        setMenuCategories(categories);
        if (!categories.some((category) => category.id === activeCategory)) {
          setActiveCategory(categories[0]?.id || "");
        }
      } catch {
        setMenuCategories(fallbackMenuCategories);
        if (!fallbackMenuCategories.some((category) => category.id === activeCategory)) {
          setActiveCategory(fallbackMenuCategories[0]?.id || "");
        }
      }
    }

    loadMenu();
    const onMenuChanged = () => loadMenu();

    socket.on("menu_created", onMenuChanged);
    socket.on("menu_updated", onMenuChanged);
    socket.on("menu_deleted", onMenuChanged);

    return () => {
      socket.off("menu_created", onMenuChanged);
      socket.off("menu_updated", onMenuChanged);
      socket.off("menu_deleted", onMenuChanged);
    };
  }, [activeCategory]);

  const activeCategoryData = useMemo(
    () => menuCategories.find((category) => category.id === activeCategory) ?? menuCategories[0],
    [activeCategory, menuCategories],
  );

  const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.totalPrice, 0), [cartItems]);
  const deliveryCharge = cartItems.length > 0 ? 20 : 0;
  const grandTotal = subtotal + deliveryCharge;
  const showMobileCartActions = cartItems.length > 0;

  const handleVariantChange = (itemName, variant) => {
    setVariantSelections((prev) => ({ ...prev, [itemName]: variant }));
  };

  const addToCart = (item, imageSrc, event) => {
    const variants = Object.entries(item.prices);
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

    const imageElement = event.currentTarget.closest("article")?.querySelector("img");
    const imageRect = imageElement?.getBoundingClientRect();
    const cartRect = cartButtonRef.current?.getBoundingClientRect();

    if (imageRect && cartRect) {
      setFlyItem({
        id: `${item.name}-${Date.now()}`,
        src: imageSrc,
        start: imageRect,
        end: cartRect,
      });
      window.setTimeout(() => setFlyItem(null), 700);
    }

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

  const placeOrder = async () => {
    if (!customer.customerName || !customer.phone || !customer.flatNo || !customer.roomOrFloor || !customer.landmark) {
      toast.error("Please complete flat number, room/floor, and nearby landmark.");
      return;
    }
    if (cartItems.length === 0) {
      toast.error("Cart is empty.");
      return;
    }

    setPlacingOrder(true);
    try {
      const payload = {
        customerName: customer.customerName,
        phone: customer.phone,
        address: buildDeliveryAddress(customer),
        items: cartItems,
        deliveryCharge,
        total: grandTotal,
      };
      const response = await axios.post(`${API_BASE_URL}/api/orders`, payload);
      socket.emit("new_order", response.data);

      toast.success("Your order is being prepared");
      setCartItems([]);
      setCustomer({
        customerName: userSession?.name || "",
        phone: userSession?.phone || "",
        flatNo: "",
        roomOrFloor: "",
        landmark: "",
      });
      setCartOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Order failed. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  const menuContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.03,
      },
    },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  };

  return (
    <div className="relative min-h-screen bg-[var(--cbk-bg)] pb-24 text-[var(--cbk-text)]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[rgba(18,18,18,.75)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="Chakhna By Kilo" className="h-11 w-11 rounded-full border border-[var(--cbk-gold)]/60 object-cover" />
            <div>
              <h1 className="font-heading text-xl leading-none">Chakhna By Kilo</h1>
              <p className="text-xs text-white/70">By Kilo, By Choice, By Taste</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" })}
              className="hidden rounded-full border border-[var(--cbk-gold)]/35 bg-white/5 px-4 py-2 text-sm md:inline-flex"
            >
              Explore Menu
            </button>
            <button
              type="button"
              onClick={onOpenHistory}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium"
            >
              <ReceiptText size={16} />
              Orders
            </button>
            <button type="button" onClick={onLogout} className="inline-flex items-center gap-2 rounded-full bg-[var(--cbk-crimson)] px-4 py-2 text-sm font-medium">
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden px-4 pb-14 pt-16 sm:px-6 sm:pt-20">
        <div className="absolute inset-0">
          <AnimatePresence mode="wait">
            <motion.img
              key={heroSlides[currentHeroSlide].image}
              src={heroSlides[currentHeroSlide].image}
              alt={heroSlides[currentHeroSlide].title}
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.src = "/menu1.jpeg";
              }}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(18,18,18,.86),rgba(18,18,18,.62),rgba(139,0,0,.5))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(212,160,23,.24),transparent_35%)]" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[78vh] w-full max-w-7xl flex-col justify-end">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
            <p className="mb-3 text-sm tracking-[0.2em] text-[var(--cbk-gold)]">PREMIUM DELIVERY EXPERIENCE</p>
            <h2 className="font-heading text-4xl leading-tight sm:text-6xl">Crafted flavors, delivered with finesse.</h2>
            <p className="mt-5 max-w-xl text-sm text-white/80 sm:text-base">
              A refined menu of bold Kolkata favorites with smooth ordering, elegant interactions, and chef-driven quality.
            </p>

            <motion.button
              type="button"
              onClick={() => document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" })}
              animate={{ y: [0, 8, 0], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm backdrop-blur"
            >
              Scroll to Menu
              <span className="text-lg">↓</span>
            </motion.button>
          </motion.div>
        </div>
      </section>

      <main id="menu" className="mx-auto max-w-7xl space-y-6 px-4 pb-8 pt-8 sm:px-6">
        <CategoryBar categories={menuCategories} activeCategory={activeCategory} onSelect={setActiveCategory} />

        <AnimatePresence mode="wait">
          <motion.section
            key={activeCategoryData?.id || "empty"}
            layout
            variants={menuContainerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {(activeCategoryData?.items || []).map((item) => (
              <MenuCard
                key={`${activeCategoryData.id}-${item.name}`}
                item={item}
                categoryTitle={activeCategoryData.title}
                selectedVariant={variantSelections[item.name]}
                onVariantChange={handleVariantChange}
                onAdd={addToCart}
              />
            ))}
          </motion.section>
        </AnimatePresence>
      </main>

      <motion.button
        ref={cartButtonRef}
        type="button"
        onClick={() => setCartOpen(true)}
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        className={[
          "fixed right-4 z-50 rounded-full border border-[var(--cbk-gold)]/50 bg-[rgba(139,0,0,.82)] px-5 py-3 text-sm font-semibold shadow-[0_12px_30px_rgba(0,0,0,.45)] backdrop-blur md:bottom-6",
          showMobileCartActions ? "bottom-20 inline-flex" : "hidden md:inline-flex md:bottom-6",
        ].join(" ")}
      >
        <span className="inline-flex items-center gap-2">
          <ShoppingCart size={16} />
          Checkout Cart ({cartItems.length})
        </span>
      </motion.button>

      <AnimatePresence>
        {flyItem && (
          <motion.img
            key={flyItem.id}
            src={flyItem.src}
            alt="Item moving to cart"
            initial={{
              position: "fixed",
              left: flyItem.start.left,
              top: flyItem.start.top,
              width: flyItem.start.width,
              height: flyItem.start.height,
              borderRadius: 12,
              zIndex: 80,
              opacity: 0.95,
            }}
            animate={{
              left: flyItem.end.left + flyItem.end.width / 2 - 20,
              top: flyItem.end.top + flyItem.end.height / 2 - 20,
              width: 40,
              height: 40,
              opacity: 0.45,
              scale: 0.6,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: "easeInOut" }}
            className="pointer-events-none object-cover"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close cart"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCartOpen(false)}
              className="fixed inset-0 z-40 bg-black/60"
            />

            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 220, damping: 28 }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[linear-gradient(180deg,rgba(25,25,25,.98),rgba(18,18,18,.98))] p-4"
            >
              <div className="mb-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={18} className="text-[var(--cbk-gold)]" />
                  <h3 className="font-heading text-2xl">Your Cart</h3>
                </div>
                <button type="button" onClick={() => setCartOpen(false)} className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-sm">
                  <X size={14} />
                  Close
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {cartItems.length === 0 && <p className="text-sm text-white/70">Your cart is empty.</p>}
                {cartItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.06] p-3 shadow-[0_10px_22px_rgba(0,0,0,.22)]">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-white/70">{item.variant}</p>
                      </div>
                      <p className="text-sm font-semibold text-[var(--cbk-gold)]">{formatINR(item.totalPrice)}</p>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button type="button" onClick={() => updateQuantity(item.id, -1)} className="h-7 w-7 rounded-md bg-white/10">
                        -
                      </button>
                      <span className="text-sm">{item.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(item.id, 1)} className="h-7 w-7 rounded-md bg-white/10">
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                <div className="grid grid-cols-1 gap-2">
                  <input
                    type="text"
                    value={customer.customerName}
                    disabled
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  />
                  <input
                    type="tel"
                    value={customer.phone}
                    disabled
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="inline-flex items-center gap-1 text-xs text-white/75">
                      <Building2 size={13} />
                      Flat No
                    </span>
                    <input
                      type="text"
                      value={customer.flatNo}
                      onChange={(event) => setCustomer((prev) => ({ ...prev, flatNo: event.target.value }))}
                      placeholder="Flat / House no"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[var(--cbk-gold)]/60"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="inline-flex items-center gap-1 text-xs text-white/75">
                      <House size={13} />
                      Room No / Floor
                    </span>
                    <input
                      type="text"
                      value={customer.roomOrFloor}
                      onChange={(event) => setCustomer((prev) => ({ ...prev, roomOrFloor: event.target.value }))}
                      placeholder="Room number or floor"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[var(--cbk-gold)]/60"
                    />
                  </label>
                </div>

                <label className="space-y-1">
                  <span className="inline-flex items-center gap-1 text-xs text-white/75">
                    <Landmark size={13} />
                    Nearby Landmark
                  </span>
                  <input
                    type="text"
                    value={customer.landmark}
                    onChange={(event) => setCustomer((prev) => ({ ...prev, landmark: event.target.value }))}
                    placeholder="e.g. Opposite Technocity Gate"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[var(--cbk-gold)]/60"
                  />
                </label>

                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-white/80">
                  <p className="flex justify-between"><span>Subtotal</span><span>{formatINR(subtotal)}</span></p>
                  <p className="flex justify-between"><span>Delivery</span><span>{formatINR(deliveryCharge)}</span></p>
                  <p className="mt-1 flex justify-between font-semibold text-[var(--cbk-gold)]"><span>Payable</span><span>{formatINR(grandTotal)}</span></p>
                </div>

                <button
                  type="button"
                  disabled={placingOrder}
                  onClick={placeOrder}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--cbk-gold)] to-[#bf8d15] px-4 py-3 font-semibold text-black disabled:opacity-70"
                >
                  <MapPinned size={16} />
                  {placingOrder ? "Processing Checkout..." : "Checkout Cart"}
                  {!placingOrder && <ChevronRight size={16} />}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[rgba(18,18,18,.95)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around py-2 text-xs">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex min-w-20 flex-col items-center gap-1 rounded-lg px-4 py-2"
          >
            <House size={16} />
            Home
          </button>
          <button
            type="button"
            onClick={() => document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex min-w-20 flex-col items-center gap-1 rounded-lg px-4 py-2"
          >
            <UtensilsCrossed size={16} />
            Menu
          </button>
          <button
            type="button"
            onClick={onOpenHistory}
            className="inline-flex min-w-20 flex-col items-center gap-1 rounded-lg px-4 py-2"
          >
            <ReceiptText size={16} />
            Orders
          </button>
          {showMobileCartActions && (
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="inline-flex min-w-24 flex-col items-center gap-1 rounded-lg px-4 py-2 text-[var(--cbk-gold)]"
            >
              <ShoppingCart size={16} />
              Checkout Cart
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}

export default Home;
