import { motion } from "framer-motion";
import { getFoodImage } from "../utils/getFoodImage";

function formatINR(value) {
  return `Rs ${value}`;
}

function MenuCard({ item, categoryTitle, selectedVariant, onVariantChange, onAdd }) {
  const variants = Object.keys(item.prices);
  const currentVariant = selectedVariant || variants[0];
  const currentPrice = item.prices[currentVariant];
  const imageSrc = getFoodImage(item.name, categoryTitle);

  return (
    <motion.article
      layout
      variants={{
        hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
        visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.35 } },
      }}
      className="group overflow-hidden rounded-2xl border border-white/10 bg-[rgba(255,255,255,.04)] shadow-[0_12px_32px_rgba(0,0,0,.35)] backdrop-blur-xl"
    >
      <div className="overflow-hidden">
        <img
          src={imageSrc}
          alt={item.name}
          className="h-48 w-full object-cover rounded-t-xl transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = getFoodImage("", categoryTitle || "indian");
          }}
        />
      </div>

      <div className="space-y-3 p-4">
        <h3 className="font-heading text-lg leading-tight text-[var(--cbk-text)]">{item.name}</h3>
        <p className="text-sm font-semibold tracking-wide text-[var(--cbk-gold)]">{formatINR(currentPrice)}</p>

        {variants.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => (
              <button
                key={variant}
                type="button"
                onClick={() => onVariantChange(item.name, variant)}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs transition",
                  currentVariant === variant
                    ? "border-[var(--cbk-gold)] bg-[rgba(212,160,23,.18)] text-[var(--cbk-text)]"
                    : "border-white/15 bg-black/20 text-white/70 hover:text-white",
                ].join(" ")}
              >
                {variant}
              </button>
            ))}
          </div>
        )}

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={(event) => onAdd(item, imageSrc, event)}
          className="w-full rounded-xl bg-gradient-to-r from-[var(--cbk-crimson)] to-[#5f0000] px-4 py-2.5 text-sm font-semibold tracking-wide text-[var(--cbk-text)]"
        >
          Add to Cart
        </motion.button>
      </div>
    </motion.article>
  );
}

export default MenuCard;
