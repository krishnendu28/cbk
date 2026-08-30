import { useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import CategoryBar from "../components/CategoryBar";
import MenuCard from "../components/MenuCard";
import { menuCategories as fallbackMenuCategories } from "../data/menuData";
import { useCart } from "../context/cart-context";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

function MenuPage({ onBack }) {
  const {
    menuCategories: liveMenu,
    cartItems,
    isOrderingOpen,
    variantSelections,
    handleVariantChange,
    addToCart,
    favorites,
    toggleFavorite,
  } = useCart();

  const [filterCategory, setFilterCategory] = useState("");

  const categories = useMemo(
    () => (liveMenu?.length ? liveMenu : fallbackMenuCategories),
    [liveMenu],
  );

  const visibleCategories = useMemo(
    () => (filterCategory ? categories.filter((category) => category.id === filterCategory) : categories),
    [categories, filterCategory],
  );

  const totalItems = useMemo(
    () => visibleCategories.reduce((sum, category) => sum + category.items.filter((item) => item.available !== false).length, 0),
    [visibleCategories],
  );

  return (
    <div className="min-h-screen bg-[var(--cbk-bg)] pb-24 text-[var(--cbk-text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--cbk-orange)]/15 bg-[rgba(255,247,237,.92)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="Chakhna By Kilo" className="h-10 w-10 rounded-full border border-[var(--cbk-orange)]/40 object-cover" />
            <div>
              <h1 className="font-heading text-lg leading-none text-[var(--cbk-crimson)]">Menu</h1>
              <p className="text-xs text-[var(--cbk-text)]/60">{totalItems} dishes available now</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--cbk-orange)]/30 bg-white px-4 py-2 text-sm font-medium text-[var(--cbk-text)]"
          >
            <ArrowLeft size={16} />
            Back to Home
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-8 pt-6 sm:px-6">
        {!isOrderingOpen && (
          <div className="mb-4 rounded-xl border border-[var(--cbk-crimson)]/25 bg-[var(--cbk-crimson)]/8 px-4 py-3 text-sm text-[var(--cbk-crimson)]">
            Ordering is closed for now. You can browse the menu, but checkout is disabled.
          </div>
        )}

        <CategoryBar categories={categories} activeCategory={filterCategory} onSelect={setFilterCategory} />

        {visibleCategories.map((category) => {
          const items = category.items.filter((item) => item.available !== false);
          if (items.length === 0) return null;
          return (
            <section key={category.id} className="mb-7">
              <h2 className="mb-3 font-heading text-2xl text-[var(--cbk-crimson)]">{category.title}</h2>
              <Motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {items.map((item) => (
                  <MenuCard
                    key={`${category.id}-${item.name}`}
                    item={item}
                    categoryTitle={category.title}
                    selectedVariant={variantSelections[item.name]}
                    onVariantChange={handleVariantChange}
                    onAdd={addToCart}
                    onToggleFavorite={toggleFavorite}
                    isFavorite={favorites.includes(item.name)}
                    orderingOpen={isOrderingOpen}
                  />
                ))}
              </Motion.div>
            </section>
          );
        })}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--cbk-orange)]/15 bg-[rgba(255,247,237,.96)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around py-2 text-xs text-[var(--cbk-text)]">
          <button type="button" onClick={onBack} className="inline-flex min-w-20 flex-col items-center gap-1 rounded-lg px-4 py-2">
            <ArrowLeft size={16} />
            Home
          </button>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="inline-flex min-w-20 flex-col items-center gap-1 rounded-lg px-4 py-2">
            <ShoppingCart size={16} className="text-[var(--cbk-orange)]" />
            Top
          </button>
          <button type="button" onClick={() => cartItems.length > 0 && document.getElementById("cart-fab")?.click()} className="inline-flex min-w-24 flex-col items-center gap-1 rounded-lg px-4 py-2 text-[var(--cbk-orange)]">
            <ShoppingCart size={16} />
            Cart ({cartItems.length})
          </button>
        </div>
      </nav>

      <button id="cart-fab" type="button" className="hidden" />
    </div>
  );
}

export default MenuPage;