export const NON_VEG_KEYWORDS = ["chicken", "egg", "fish", "mutton", "prawn", "keema", "murga"];

export function isNonVegItem(name: string | undefined | null): boolean {
  const lowered = String(name || "").toLowerCase();
  return NON_VEG_KEYWORDS.some((keyword) => lowered.includes(keyword));
}

export function isVegItem(name: string | undefined | null): boolean {
  return !isNonVegItem(name);
}

export type VegFilter = "All" | "Veg" | "NonVeg";
