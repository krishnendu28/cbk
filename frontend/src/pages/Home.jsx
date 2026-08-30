import { useEffect, useState } from "react";
import { motion as Motion } from "framer-motion";
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
} from "lucide-react";
import { useCart } from "../context/cart-context";
import { getFoodImage } from "../utils/getFoodImage";

const CONTACT_PHONE = "+918420252042";

const SELLER_GROUPS = [
  {
    id: "veg",
    title: "Vegetarian Bestsellers",
    badge: "VEG",
    accent: "text-[var(--cbk-orange)]",
    items: [
      { label: "Paneer Masala", itemName: "Paneer Butter Masala 8pcs", prices: { Half: 100, Full: 170 } },
      { label: "Mushroom Masala", itemName: "Mushroom Masala", prices: { Half: 110, Full: 180 } },
      { label: "Paneer Pakoda", itemName: "Paneer Pakoda 8pcs", prices: { Half: 120, Full: 190 } },
    ],
  },
  {
    id: "nonveg",
    title: "Non-Vegetarian Bestsellers",
    badge: "NON-VEG",
    accent: "text-[var(--cbk-crimson)]",
    items: [
      { label: "Handi Mutton", itemName: "Handi Mutton 250gm", prices: { Half: 220, Full: 350 } },
      { label: "Handi Chicken", itemName: "Handi Chicken 250gm", prices: { Half: 120, Full: 185 } },
      { label: "Chicken 65", itemName: "Chicken 65/69 8pc", prices: { Half: 130, Full: 210 } },
      { label: "Chicken Lollipop", itemName: "Chicken Lollipop 8pcs", prices: { Half: 130, Full: 210 } },
    ],
  },
];

const MAKHANA_ITEM = {
  label: "Makhana",
  itemName: "Makhana Roasted (200gm)",
  prices: { Regular: 199 },
  image:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Dried_lotus_seeds_snack.jpg/960px-Dried_lotus_seeds_snack.jpg",
};

function formatINR(value) {
  return `Rs ${value}`;
}

function priceFrom(variants) {
  const values = Object.values(variants || {});
  return values.length ? Math.min(...values) : 0;
}

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

  useEffect(() => {
    const close = () => setProfileOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
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
      prices: live?.prices || seller.prices,
      available: live ? live.available !== false : true,
      image: getFoodImage(seller.itemName, "Main Course"),
    };
  };

  const handleQuickAdd = (seller) => {
    if (!isOrderingOpen) {
      toast.error("Ordering is closed right now.");
      return;
    }
    addToCart({ ...seller, name: seller.itemName }, seller.image);
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
                    <p className="text-xs text-[var(--cbk-text)]/60">{userSession?.phone || "Not logged in"}</p>
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

      <section className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <Motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="mb-3 text-sm font-semibold tracking-[0.18em] text-[var(--cbk-orange)]">PREMIUM DELIVERY EXPERIENCE</p>
            <h2 className="font-heading text-4xl leading-tight text-[var(--cbk-crimson)] sm:text-6xl">
              Crafted flavors, delivered with finesse.
            </h2>
            <p className="mt-5 max-w-xl text-[var(--cbk-text)]/75 sm:text-base">
              Bold Kolkata favourites, chef-crafted and delivered hot. Order in a tap and track it live.
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
                onClick={() => document.getElementById("best-sellers")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--cbk-orange)]/30 bg-white px-6 py-3 text-sm font-semibold text-[var(--cbk-text)]"
              >
                <Sparkles size={16} className="text-[var(--cbk-orange)]" />
                Today's Favourites
              </button>
            </div>

            {firstOrderEligible && (
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--cbk-crimson)]/25 bg-white px-4 py-2 text-sm font-semibold text-[var(--cbk-crimson)]">
                <TicketPercent size={15} />
                Welcome! {settings.firstOrderDiscountRate}% OFF your first order
              </div>
            )}
          </Motion.div>

          <Motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            className="relative overflow-hidden rounded-3xl border border-[var(--cbk-orange)]/20 shadow-xl"
          >
            <img
              src="/menu4.jpeg"
              alt="Chakhna by Kilo signature spread"
              className="h-64 w-full object-cover sm:h-80"
              onError={(e) => {
                e.currentTarget.src = "/menu1.jpeg";
              }}
            />
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
        <section className="relative mb-10 overflow-hidden rounded-3xl border-2 border-[var(--cbk-crimson)]/25 bg-gradient-to-br from-[var(--cbk-crimson)] via-white to-[var(--cbk-cream)] p-6 shadow-lg sm:p-8">
          <span className="absolute -top-2.5 left-6 rotate-[-2deg] rounded-full bg-[var(--cbk-crimson)] px-4 py-1.5 text-xs font-black tracking-widest text-white shadow">
            NEW LAUNCH
          </span>
          <div className="grid items-center gap-5 sm:grid-cols-[auto_1fr_auto]">
            <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-3xl border-4 border-white shadow-lg sm:h-48 sm:w-48">
              <img
                src={MAKHANA_ITEM.image}
                alt="Makhana Roasted"
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = "/menu4.jpeg";
                }}
              />
              <span className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[var(--cbk-crimson)]/20 to-transparent" />
            </div>
            <div>
              <h4 className="font-heading text-3xl leading-tight text-[var(--cbk-crimson)] sm:text-4xl">
                Our New Product — Makhana
              </h4>
              <p className="mt-2 text-sm text-[var(--cbk-text)]/75 sm:text-base">
                {MAKHANA_ITEM.itemName} — premium roasted fox nuts, packed fresh and delivered to your door.
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[var(--cbk-orange)]">
                Just {formatINR(priceFrom(MAKHANA_ITEM.prices))} per pack
              </p>
            </div>
            <button
              type="button"
              disabled={!isOrderingOpen}
              onClick={() => {
                if (!isOrderingOpen) {
                  toast.error("Ordering is closed right now.");
                  return;
                }
                addToCart({ ...MAKHANA_ITEM, name: MAKHANA_ITEM.itemName }, MAKHANA_ITEM.image);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--cbk-crimson)] to-[var(--cbk-orange)] px-7 py-4 text-sm font-bold text-white shadow-xl disabled:opacity-50"
            >
              <ShoppingCart size={16} />
              Order {formatINR(priceFrom(MAKHANA_ITEM.prices))}
            </button>
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

        <div className="grid gap-6 md:grid-cols-2">
          {SELLER_GROUPS.map((group) => (
            <section
              key={group.id}
              onClick={onOpenMenu}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onOpenMenu();
              }}
              className="cursor-pointer rounded-3xl border border-[var(--cbk-orange)]/15 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-4 flex items-center justify-between">
                <h4 className="font-heading text-xl text-[var(--cbk-text)]">{group.title}</h4>
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-wide ${group.accent} bg-[var(--cbk-bg)] border`}>
                  {group.badge}
                </span>
              </div>
              <div className="space-y-3">
                {group.items.map((seller) => {
                  const dish = sellerWithLiveData(seller);
                  const fromPrice = priceFrom(dish.prices);
                  return (
                    <div key={seller.itemName} className="flex items-center gap-3 rounded-2xl border border-[var(--cbk-text)]/10 bg-[var(--cbk-bg)] p-2.5">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                        <img
                          src={dish.image}
                          alt={seller.itemName}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = "/menu1.jpeg";
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="truncate text-sm font-semibold">{seller.label}</p>
                          <button
                            type="button"
                            aria-label="Favorite"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleFavorite(seller.itemName);
                            }}
                            className="shrink-0 rounded-full p-1 text-[var(--cbk-crimson)]"
                          >
                            <Heart size={15} fill={isFavorite(seller.itemName) ? "currentColor" : "none"} />
                          </button>
                        </div>
                        <p className="text-xs text-[var(--cbk-text)]/60">
                          {Object.keys(dish.prices).length > 1 ? "from " : ""}
                          <span className="text-sm font-bold text-[var(--cbk-orange)]">{formatINR(fromPrice)}</span>
                        </p>
                        <button
                          type="button"
                          disabled={!isOrderingOpen || dish.available === false}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleQuickAdd(dish);
                          }}
                          className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[var(--cbk-crimson)] to-[var(--cbk-orange)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          <ShoppingCart size={13} />
                          {dish.available === false ? "Unavailable" : "Order"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>

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