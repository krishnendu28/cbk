import { motion } from "framer-motion";

function CategoryBar({ categories, activeCategory, onSelect }) {
  return (
    <div className="no-scrollbar flex gap-3 overflow-x-auto pb-3">
      {categories.map((category) => {
        const isActive = activeCategory === category.id;
        return (
          <motion.button
            key={category.id}
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => onSelect(category.id)}
            className={[
              "rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-all",
              isActive
                ? "border-[var(--cbk-gold)] bg-[rgba(139,0,0,.72)] text-[var(--cbk-text)] shadow-[0_0_24px_rgba(139,0,0,.45)]"
                : "border-white/10 bg-white/5 text-white/80 hover:border-[var(--cbk-gold)]/35 hover:text-white",
            ].join(" ")}
          >
            {category.title}
          </motion.button>
        );
      })}
    </div>
  );
}

export default CategoryBar;
