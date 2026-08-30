import { motion as Motion } from "framer-motion";
import { Heart, Plus } from "lucide-react";
import { getFoodImage } from "../utils/getFoodImage";

function formatINR(value) {
  return `Rs ${value}`;
}

function MenuCard({ item, categoryTitle, selectedVariant, onVariantChange, onAdd, onToggleFavorite, isFavorite, orderingOpen = true }) {
  const variants = Object.keys(item.prices || {});
  const currentVariant = selectedVariant || variants[0];
  const currentPrice = item.prices?.[currentVariant];
  const imageSrc = getFoodImage(item.name, categoryTitle);

  return (
    <Motion.article
      layout
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
      }}
      className="flex gap-3 rounded-2xl border border-orange-900/10 bg-white p-2.5 shadow-sm hover:shadow-md"
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl">
        <img
          src={imageSrc}
          alt={item.name}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = getFoodImage("", categoryTitle || "indian");
          }}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-1">
          <h4 className="truncate text-sm font-semibold text-[var(--cbk-text)]">{item.name}</h4>
          <button
            type="button"
            aria-label={`${isFavorite ? "Remove" : "Add"} ${item.name} to favourites`}
            onClick={() => onToggleFavorite(item.name)}
            className="shrink-0 rounded-full p-1 text-[var(--cbk-crimson)]"
          >
            <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>

        <p className="mt-0.5 text-sm font-bold text-[var(--cbk-orange)]">
          {formatINR(currentPrice)}
          {variants.length > 1 && <span className="ml-1 text-[10px] font-medium text-[var(--cbk-text)]/60">/ {currentVariant}</span>}
        </p>

        {variants.length > 1 && (
          <div className="no-scrollbar mt-1 flex gap-1 overflow-x-auto pb-1">
            {variants.map((variant) => (
              <button
                key={variant}
                type="button"
                onClick={() => onVariantChange(item.name, variant)}
                className={[
                  "rounded-full border px-2 py-0.5 text-[10px] transition whitespace-nowrap",
                  currentVariant === variant
                    ? "border-[var(--cbk-orange)] bg-[var(--cbk-orange)]/10 text-[var(--cbk-orange)]"
                    : "border-[var(--cbk-text)]/15 text-[var(--cbk-text)]/60 hover:text-[var(--cbk-text)]",
                ].join(" ")}
              >
                {variant}
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center gap-2 pt-1.5">
          <Motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            disabled={!orderingOpen}
            onClick={() => onAdd(item)}
            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[var(--cbk-crimson)] to-[var(--cbk-orange)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            <Plus size={13} />
            {orderingOpen ? "Add" : "Closed"}
          </Motion.button>
          <span className="text-xs text-[var(--cbk-text)]/50">
            {item.available === false ? "Currently unavailable" : categoryTitle}
          </span>
        </div>
      </div>
    </Motion.article>
  );
}

export default MenuCard;