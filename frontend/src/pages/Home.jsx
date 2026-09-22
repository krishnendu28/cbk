import { useEffect, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  Clock3,
  Heart,
  House,
  LogOut,
  Phone,
  ReceiptText,
  ShoppingCart,
  Sparkles,
  TicketPercent,
  UserRound,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useCart } from "../context/cart-context";
import { getFoodImage } from "../utils/getFoodImage";
import { portionMapFor } from "../utils/portions";

const CONTACT_PHONE = "+918420252042";

const SELLER_GROUPS = [
  {
    id: "veg",
    title: "Vegetarian Bestsellers",
    badge: "VEG",
    accent: "text-[var(--cbk-orange)]",
    items: [
      { label: "Paneer Masala", itemName: "Paneer Butter Masala (8 pcs)", prices: { Half: 130, Full: 199 } },
      { label: "Mushroom Masala", itemName: "Mushroom Masala", prices: { Half: 130, Full: 199 } },
      { label: "Paneer Pakoda", itemName: "Paneer Pakoda (8 pcs)", prices: { Half: 130, Full: 199 } },
    ],
  },
  {
    id: "nonveg",
    title: "Non-Vegetarian Bestsellers",
    badge: "NON-VEG",
    accent: "text-[var(--cbk-crimson)]",
    items: [
      { label: "Handi Mutton", itemName: "Handi Mutton (15-16 pcs)", prices: { "250gm": 360, "500gm": 699, "1kg": 1250 } },
      { label: "Handi Chicken", itemName: "Handi Chicken (15-16 pcs)", prices: { "250gm": 199, "500gm": 385, "1kg": 675 } },
      { label: "Chicken 65", itemName: "Chicken 65(8) (8 pcs)", prices: { Half: 150, Full: 220 } },
      { label: "Chicken Lollipop", itemName: "Chicken Lollipop (Drums of Heaven 8 pcs)", prices: { Half: 150, Full: 220 } },
    ],
  },
];

const DRY_FRUIT_IMAGES = {
  makhana: "https://cbk-gamma.vercel.app/menu/makhana.jpg",
  kaju: "https://cbk-gamma.vercel.app/menu/kaju.jpg",
  almond: "https://cbk-gamma.vercel.app/menu/almond.jpg",
  kismis: "https://cbk-gamma.vercel.app/menu/kismis.jpg",
};

const NEW_LAUNCH_PRODUCTS = [
  {
    key: "makhana",
    name: "Makhana Roasted 250gm",
    prices: { Standard: 250, Premium: 350 },
    image: DRY_FRUIT_IMAGES.makhana,
    tagline: "Premium roasted fox nuts, lightly spiced & packed fresh.",
  },
  {
    key: "kaju",
    name: "Kaju 1kg",
    prices: { "Medium Size": 1100, "Bigger Size": 1400 },
    image: DRY_FRUIT_IMAGES.kaju,
    tagline: "Whole cashew nuts — rich, buttery and crunch-fresh.",
  },
  {
    key: "almond",
    name: "Almond 1kg",
    prices: { Standard: 1100, Premium: 1300 },
    image: DRY_FRUIT_IMAGES.almond,
    tagline: "Premium whole almonds (badam), naturally delicious & healthy.",
  },
  {
    key: "kismis",
    name: "Kismis 1kg",
    prices: { Standard: 520, Premium: 700 },
    image: DRY_FRUIT_IMAGES.kismis,
    tagline: "Sweet golden raisins (kismis), soft, juicy & sun-dried.",
  },
];

function formatINR(value) {
  return `Rs ${value}`;
}

function priceFrom(variants) {
  const values = Object.values(variants || {});
  return values.length ? Math.min(...values) : 0;
}

const HERO_SLIDES = [
  {
    image: "/menu4.jpeg",
    fallbackImage: "/menu1.jpeg",
    eyebrow: "SIGNATURE CHAMPARAN STYLE",
    title: "HANDI MUTTON AND HANDI CHICKEN",
    subtitle: "Slow-cooked dum-style in a sealed copper handi — our signature USP, rich and rustic.",
  },
  {
    image: "/menu1.jpeg",
    fallbackImage: "/menu2.jpeg",
    eyebrow: "MAIN USP · GHAR JAISA KHANA",
    title: "MONTHLY MEAL AVAILABLE",
    subtitle: "Healthy, homely, hassle-free subscription — daily lunch & dinner delivered on time.",
  },
  {
    image: "/menu2.jpeg",
    fallbackImage: "/menu3.jpeg",
    eyebrow: "PREMIUM DELIVERY EXPERIENCE",
    title: "Crafted flavors, delivered with finesse.",
    subtitle: "Bold Kolkata favourites, chef-crafted and delivered hot. Order in a tap and track it live.",
  },
];

function Home({ userSession, onLogout, onOpenMenu, onOpenHistory }) {
  const {
    menuCategories,
    isOrderingOpen,
    addToCart,
    toggleFavorite,
    isFavorite,
    setCartOpen,
    cartItems,
    settings,
    deliveryCharge,
    firstOrderEligible,
    showMobileCartActions,
  } = useCart();

  const [profileOpen, setProfileOpen] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [activeSeller, setActiveSeller] = useState(null);

  useEffect(() => {
    const close = () => setProfileOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const findDish = (itemName) => {
    for (const category of menuCategories) {
      const match = category.items.find((entry) => entry.name === itemName);
      if (match) return match;
    }
    return null;
  };

  const sellerWithLiveData = (seller) => {
    const live = findDish(seller.itemName);
    return {
      ...seller,
      name: seller.itemName,
      prices: live?.prices || seller.prices,
      description: live?.description || "",
      portions: live?.portions || {},
      available: live ? live.available !== false : true,
      image: live?.image || getFoodImage(seller.itemName, "Main Course"),
    };
  };

  const handleQuickAdd = (dish) => {
    if (!isOrderingOpen) {
      toast.error("Ordering is closed right now.");
      return;
    }
    addToCart(dish);
  };

  const handleContact = () => {
    if (CONTACT_PHONE) {
      window.location.href = `tel:${CONTACT_PHONE}`;
    } else {
      toast("Restaurant contact number coming soon.");
    }
  };

  const timings = settings.orderWindows
    .map((window) => `${window.name}: ${window.start} – ${window.end}`)
    .join("  |  ");

  return (
    <div className="min-h-screen bg-[var(--cbk-bg)] pb-24 text-[var(--cbk-text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--cbk-orange)]/15 bg-[rgba(255,247,237,.92)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="Chakhna By Kilo" className="h-11 w-11 rounded-full border border-[var(--cbk-orange)]/40 object-cover" />
            <div>
              <h1 className="font-heading text-xl leading-none text-[var(--cbk-crimson)]">Chakhna By Kilo</h1>
              <p className="text-xs text-[var(--cbk-text)]/60">By Kilo, By Choice, By Taste</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenMenu}
              className="hidden rounded-full border border-[var(--cbk-orange)]/30 bg-white px-4 py-2 text-sm font-medium text-[var(--cbk-text)] md:inline-flex"
            >
              <UtensilsCrossed size={16} className="mr-1" />
              Menu
            </button>
            <button
              type="button"
              onClick={onOpenHistory}
              className="hidden rounded-full border border-[var(--cbk-orange)]/30 bg-white px-4 py-2 text-sm font-medium text-[var(--cbk-text)] md:inline-flex"
            >
              <ReceiptText size={16} className="mr-1" />
              Orders
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setProfileOpen((prev) => !prev);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--cbk-crimson)] to-[var(--cbk-orange)] px-3 py-2 text-sm font-semibold text-white"
              >
                <UserRound size={16} />
                {userSession?.name ? userSession.name.split(" ")[0] : "Profile"}
              </button>

              {profileOpen && (
                <div
                  className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-[var(--cbk-orange)]/20 bg-white shadow-xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="border-b border-[var(--cbk-text)]/10 px-4 py-3">
                    <p className="text-sm font-semibold">{userSession?.name || "Guest User"}</p>
                    <p className="text-xs text-[var(--cbk-text)]/60">{userSession?.phone || userSession?.email || "Not logged in"}</p>
                  </div>
                  <button type="button" onClick={handleContact} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-[var(--cbk-bg)]">
                    <Phone size={15} className="text-[var(--cbk-orange)]" />
                    Contact Restaurant
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!settings.promoActive || Number(settings.promoDiscountRate || 0) <= 0) {
                        toast("No active coupon right now.");
                        return;
                      }
                      toast(
                        settings.promoDiscountCode
                          ? `Use code ${settings.promoDiscountCode} for ${settings.promoDiscountRate}% OFF!`
                          : `${settings.promoDiscountRate}% OFF auto-applied on your next order!`,
                      );
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-[var(--cbk-bg)]"
                  >
                    <TicketPercent size={15} className="text-[var(--cbk-orange)]" />
                    Coupons
                    {settings.promoActive && Number(settings.promoDiscountRate || 0) > 0 && (
                      <span className="ml-auto rounded-full bg-[var(--cbk-orange)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--cbk-orange)]">
                        {settings.promoDiscountRate}% OFF
                      </span>
                    )}
                  </button>
                  <button type="button" onClick={onLogout} className="flex w-full items-center gap-2 border-t border-[var(--cbk-text)]/10 px-4 py-3 text-left text-sm text-[var(--cbk-crimson)] hover:bg-[var(--cbk-bg)]">
                    <LogOut size={15} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-4 pt-6 sm:px-6 sm:pt-8">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <Motion.div key={heroIndex} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="relative">
            <button
              type="button"
              onClick={() => setHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length)}
              className="absolute -top-2 right-0 z-10 inline-flex items-center gap-1.5 rounded-full border border-[var(--cbk-orange)]/30 bg-white/90 px-3 py-1 text-[10px] font-bold tracking-widest text-[var(--cbk-orange)] shadow-sm"
            >
              {heroIndex + 1} / {HERO_SLIDES.length} · SWIPE
            </button>
            <p className="mb-3 text-sm font-semibold tracking-[0.18em] text-[var(--cbk-orange)]">
              {HERO_SLIDES[heroIndex].eyebrow}
            </p>
            <h2 className="font-heading text-4xl leading-tight text-[var(--cbk-crimson)] sm:text-6xl">
              {HERO_SLIDES[heroIndex].title}
            </h2>
            <p className="mt-5 max-w-xl text-[var(--cbk-text)]/75 sm:text-base">
              {HERO_SLIDES[heroIndex].subtitle}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={onOpenMenu}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--cbk-crimson)] to-[var(--cbk-orange)] px-6 py-3 text-sm font-semibold text-white shadow-lg"
              >
                <UtensilsCrossed size={16} />
                Explore Menu
              </Motion.button>
              <button
                type="button"
                onClick={() => document.getElementById("new-launch")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--cbk-orange)]/30 bg-white px-6 py-3 text-sm font-semibold text-[var(--cbk-text)]"
              >
                <Sparkles size={16} className="text-[var(--cbk-orange)]" />
                Newly Launched
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-600/30 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                Monthly Meal Available
              </div>
              {firstOrderEligible && (
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--cbk-crimson)]/25 bg-white px-4 py-2 text-sm font-semibold text-[var(--cbk-crimson)]">
                  <TicketPercent size={15} />
                  Welcome! {settings.firstOrderDiscountRate}% OFF your first order
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-1.5">
              {HERO_SLIDES.map((slide, index) => (
                <button
                  key={slide.title}
                  type="button"
                  aria-label={`Go to slide ${index + 1}`}
                  onClick={() => setHeroIndex(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === heroIndex
                      ? "w-8 bg-[var(--cbk-crimson)]"
                      : "w-3 bg-[var(--cbk-orange)]/30 hover:bg-[var(--cbk-orange)]/50"
                  }`}
                />
              ))}
            </div>
          </Motion.div>

          <Motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            className="relative overflow-hidden rounded-3xl border border-[var(--cbk-orange)]/20 shadow-xl"
          >
            <AnimatePresence mode="wait">
              <Motion.img
                key={heroIndex}
                src={HERO_SLIDES[heroIndex].image}
                alt={HERO_SLIDES[heroIndex].title}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="h-64 w-full object-cover sm:h-80"
                onError={(e) => {
                  e.currentTarget.src = HERO_SLIDES[heroIndex].fallbackImage;
                }}
              />
            </AnimatePresence>
            <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-[var(--cbk-crimson)] shadow">
              <Clock3 size={14} className="text-[var(--cbk-orange)]" />
              {timings || "Lunch 12:30 – 5:30 | Dinner 6:30 – 11:30"}
            </div>
          </Motion.div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--cbk-orange)]/15 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cbk-orange)]">Order Timings</p>
            <p className="mt-1 text-sm text-[var(--cbk-text)]/80">{timings || "Lunch 12:30 – 5:30 | Dinner 6:30 – 11:30"}</p>
          </div>
          <div className="rounded-2xl border border-[var(--cbk-orange)]/15 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cbk-orange)]">Delivery Time</p>
            <p className="mt-1 text-sm text-[var(--cbk-text)]/80">Approx. {settings.etaMinutes} minutes</p>
          </div>
          <div className="rounded-2xl border border-[var(--cbk-orange)]/15 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cbk-orange)]">Delivery Charge</p>
            <p className="mt-1 text-sm text-[var(--cbk-text)]/80">{formatINR(deliveryCharge)} within delivery area</p>
          </div>
        </div>
      </section>

      <main id="best-sellers" className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
        <section id="new-launch" className="relative mb-10 overflow-hidden rounded-3xl border-2 border-[var(--cbk-crimson)]/25 bg-gradient-to-br from-[var(--cbk-crimson)] via-white to-[var(--cbk-cream)] p-4 shadow-lg sm:p-5">
          <span className="absolute -top-2.5 left-6 rotate-[-2deg] rounded-full bg-[var(--cbk-crimson)] px-4 py-1.5 text-xs font-black tracking-widest text-white shadow">
            NEW LAUNCH
          </span>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-heading text-xl leading-tight text-[var(--cbk-crimson)] sm:text-2xl">
                New in — Makhana · Kaju · Almond · Kismis
              </h4>
              <p className="mt-1 max-w-2xl text-xs text-[var(--cbk-text)]/75 sm:text-sm">
                Freshly sourced premium dry-fruits, packed and delivered to your door.
              </p>
            </div>
            <button
              type="button"
              onClick={() => document.getElementById("best-sellers")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-full border border-[var(--cbk-orange)]/30 bg-white px-4 py-2 text-xs font-semibold text-[var(--cbk-text)]"
            >
              Today's Favourites ↓
            </button>
          </div>
          <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto pb-1">
            {NEW_LAUNCH_PRODUCTS.map((product) => (
              <div
                key={product.key}
                className="w-40 shrink-0 rounded-2xl border border-[var(--cbk-orange)]/15 bg-white p-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative h-24 overflow-hidden rounded-xl">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = "/menu4.jpeg";
                    }}
                  />
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[var(--cbk-crimson)] shadow">
                    {formatINR(priceFrom(product.prices))}+
                  </span>
                </div>
                <h5 className="mt-2 truncate text-xs font-bold text-[var(--cbk-text)]">{product.name}</h5>
                <p className="mt-0.5 truncate text-[10px] text-[var(--cbk-text)]/70">
                  {Object.values(product.prices).map((value) => `₹${value}`).join(" · ")}
                </p>
                <button
                  type="button"
                  disabled={!isOrderingOpen}
                  onClick={() => {
                    if (!isOrderingOpen) {
                      toast.error("Ordering is closed right now.");
                      return;
                    }
                    addToCart({ name: product.name, prices: product.prices, image: product.image });
                  }}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-[var(--cbk-crimson)] to-[var(--cbk-orange)] px-3 py-1.5 text-[11px] font-bold text-white shadow disabled:opacity-50"
                >
                  <ShoppingCart size={12} />
                  Order
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="mb-5 flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-[var(--cbk-crimson)] to-[var(--cbk-orange)] px-5 py-4 text-white shadow-md sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/90">Hot List</p>
            <h3 className="font-heading text-2xl leading-tight sm:text-3xl">Best Seller Items of the Restaurant</h3>
            <p className="mt-1 text-sm text-white/85">Tap Order on any dish — or click a box to open the full menu.</p>
          </div>
          <button
            type="button"
            onClick={onOpenMenu}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[var(--cbk-crimson)] shadow"
          >
            <UtensilsCrossed size={15} />
            Open Full Menu
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {SELLER_GROUPS.flatMap((group) =>
            group.items.map((seller) => {
              const dish = sellerWithLiveData(seller);
              const fromPrice = priceFrom(dish.prices);
              const portions = portionMapFor(dish, group.title);
              return (
                <div key={seller.itemName} className="relative rounded-3xl border border-[var(--cbk-orange)]/15 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <button
                    type="button"
                    onClick={() => setActiveSeller({ seller: { ...seller, label: seller.label }, dish, group })}
                    className="block w-full text-left"
                    aria-label={`View ${seller.label} details`}
                  >
                    <div className="relative aspect-square overflow-hidden rounded-2xl">
                      <img
                        src={dish.image}
                        alt={seller.label}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = "/menu1.jpeg";
                        }}
                      />
                      <span
                        className={`absolute left-2 top-2 rounded-full px-2.5 py-0.5 text-[9px] font-black tracking-wide text-white ${
                          group.badge === "VEG" ? "bg-[var(--cbk-orange)]" : "bg-[var(--cbk-crimson)]"
                        }`}
                      >
                        {group.badge}
                      </span>
                      <span className="absolute bottom-1.5 right-1.5 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-[var(--cbk-crimson)] shadow">
                        {formatINR(fromPrice)}+
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-start justify-between gap-1">
                      <p className="truncate text-sm font-semibold">{seller.label}</p>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[var(--cbk-text)]/60">
                      {dish.description ||
                        (Object.keys(portions).length > 0
                          ? Object.entries(portions).map(([variant, portion]) => `${variant} · ${portion}`).join("   ")
                          : Object.keys(dish.prices).join(" / "))}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--cbk-text)]/60">
                      {Object.keys(dish.prices).length > 1 ? "from " : ""}
                      <span className="text-sm font-bold text-[var(--cbk-orange)]">{formatINR(fromPrice)}</span>
                    </p>
                  </button>

                  <button
                    type="button"
                    aria-label={`${isFavorite(seller.itemName) ? "Remove" : "Add"} ${seller.itemName} to favourites`}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleFavorite(seller.itemName);
                    }}
                    className="absolute right-4 top-4 z-10 rounded-full bg-white/95 p-1 shadow-sm text-[var(--cbk-crimson)]"
                  >
                    <Heart size={15} fill={isFavorite(seller.itemName) ? "currentColor" : "none"} />
                  </button>

                  <button
                    type="button"
                    disabled={!isOrderingOpen || dish.available === false}
                    onClick={() => {
                      if (!isOrderingOpen) {
                        toast.error("Ordering is closed right now.");
                        return;
                      }
                      handleQuickAdd(dish);
                    }}
                    className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[var(--cbk-crimson)] to-[var(--cbk-orange)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    <ShoppingCart size={13} />
                    {dish.available === false ? "Unavailable" : "Order"}
                  </button>
                </div>
              );
            }),
          )}
        </div>
      </main>

      <AnimatePresence>
        {activeSeller && (
          <>
            <Motion.button
              type="button"
              aria-label="Close item details"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveSeller(null)}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            />
            <Motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center"
            >
              <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-[0_20px_60px_rgba(0,0,0,.4)]">
                <div className="relative">
                  <img
                    src={activeSeller.dish.image}
                    alt={activeSeller.seller.label}
                    className="h-56 w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/menu1.jpeg";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setActiveSeller(null)}
                    aria-label="Close"
                    className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white"
                  >
                    <X size={18} />
                  </button>
                  <span
                    className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wide text-white ${
                      activeSeller.group.badge === "VEG" ? "bg-[var(--cbk-orange)]" : "bg-[var(--cbk-crimson)]"
                    }`}
                  >
                    {activeSeller.group.badge}
                  </span>
                  <div className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-[var(--cbk-crimson)] shadow">
                    {activeSeller.group.title}
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="font-heading text-2xl leading-tight text-[var(--cbk-text)]">{activeSeller.seller.label}</h3>
                  <p className="mt-0.5 text-xs font-semibold text-[var(--cbk-orange)]">{activeSeller.dish.name}</p>

                  {activeSeller.dish.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-[var(--cbk-text)]/75">{activeSeller.dish.description}</p>
                  ) : null}

                  <div className="mt-4 space-y-2">
                    {Object.entries(activeSeller.dish.prices).map(([variant, value]) => (
                      <div
                        key={variant}
                        className="flex items-center justify-between gap-2 rounded-xl border border-[var(--cbk-orange)]/15 bg-[var(--cbk-bg)] p-3"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--cbk-text)]">{variant}</p>
                          <p className="text-xs text-[var(--cbk-text)]/60">
                            {portionMapFor(activeSeller.dish, activeSeller.group.title)[variant] || `${activeSeller.dish.name} · ${variant}`}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="font-bold text-[var(--cbk-orange)]">{formatINR(value)}</span>
                          <button
                            type="button"
                            disabled={!isOrderingOpen || activeSeller.dish.available === false}
                            onClick={() => addToCart(activeSeller.dish, variant)}
                            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[var(--cbk-crimson)] to-[var(--cbk-orange)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            <ShoppingCart size={12} />
                            {isOrderingOpen ? "Add" : "Closed"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {activeSeller.dish.available === false && (
                    <p className="mt-3 rounded-lg border border-[var(--cbk-crimson)]/20 bg-[var(--cbk-crimson)]/5 px-3 py-2 text-xs text-[var(--cbk-crimson)]">
                      Currently unavailable — please check back later.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveSeller(null)}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-[var(--cbk-orange)]/30 bg-white px-4 py-2.5 text-sm font-semibold text-[var(--cbk-text)]"
                  >
                    Close
                  </button>
                </div>
              </div>
            </Motion.div>
          </>
        )}
      </AnimatePresence>

      <footer className="mx-auto max-w-7xl px-4 pb-6 pt-2 text-center text-xs text-[var(--cbk-text)]/55 sm:px-6">
        Chakhna By Kilo · Kolkata · {timings || "Lunch 12:30 – 5:30 | Dinner 6:30 – 11:30"}
      </footer>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--cbk-orange)]/15 bg-[rgba(255,247,237,.96)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around py-2 text-xs text-[var(--cbk-text)]">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="inline-flex min-w-20 flex-col items-center gap-1 rounded-lg px-4 py-2">
            <House size={16} />
            Home
          </button>
          <button type="button" onClick={onOpenMenu} className="inline-flex min-w-20 flex-col items-center gap-1 rounded-lg px-4 py-2">
            <UtensilsCrossed size={16} />
            Menu
          </button>
          <button type="button" onClick={onOpenHistory} className="inline-flex min-w-20 flex-col items-center gap-1 rounded-lg px-4 py-2">
            <ReceiptText size={16} />
            Orders
          </button>
          {showMobileCartActions && (
            <button type="button" onClick={() => setCartOpen(true)} className="inline-flex min-w-24 flex-col items-center gap-1 rounded-lg px-4 py-2 text-[var(--cbk-orange)]">
              <ShoppingCart size={16} />
              Cart ({cartItems.length})
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}

export default Home;