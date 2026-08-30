import { motion as Motion } from "framer-motion";

function CategoryBar({ categories, activeCategory, onSelect }) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-3">
      <Motion.button
        key="all"
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={() => onSelect("")}
        className={[
          "rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-all",
          activeCategory === ""
            ? "border-[var(--cbk-orange)] bg-[var(--cbk-crimson)] text-white shadow"
            : "border-[var(--cbk-text)]/15 bg-white text-[var(--cbk-text)]/70 hover:border-[var(--cbk-orange)]/40 hover:text-[var(--cbk-text)]",
        ].join(" ")}
      >
        All Dishes
      </Motion.button>
      {categories.map((category) => {
        const isActive = activeCategory === category.id;
        return (
          <Motion.button
            key={category.id}
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => onSelect(category.id)}
            className={[
              "rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-all",
              isActive
                ? "border-[var(--cbk-orange)] bg-[var(--cbk-crimson)] text-white shadow"
                : "border-[var(--cbk-text)]/15 bg-white text-[var(--cbk-text)]/70 hover:border-[var(--cbk-orange)]/40 hover:text-[var(--cbk-text)]",
            ].join(" ")}
          >
            {category.title}
          </Motion.button>
        );
      })}
    </div>
  );
}

export default CategoryBar;