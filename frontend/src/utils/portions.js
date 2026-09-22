const UNIT_VARIANT_RE = /^\d+(?:\.\d+)?\s*(gm|g|grams?|kg|ml|l|ltr|lit(re|er)s?|millilit(re|er)s?)\s*$/i;
const PCS_RE = /\b(\d+)\s*pcs?\b/i;
const RANGED_PCS_RE = /\((\d+)\s*-\s*(\d+)\s*pcs?\)/i;
const TOKEN_RE = /\b(\d+(?:\.\d+)?)\s*(pcs?|gm|g|grams?|kg|ml|l|ltr|lit(re|er)s?|millilit(re|er)s?)\b/i;

function normalizeUnitToken(raw) {
  const unit = String(raw || "").toLowerCase();
  if (/^(kg|kgs|kilogram[s]?)$/.test(unit)) return "kg";
  if (/^(gm|g|gram|grams|gr|gms)$/.test(unit)) return "gm";
  if (/^(ml|milliliter|millilitre|milliliters|millilitres)$/.test(unit)) return "ml";
  if (/^(l|ltr|lit|litre|liter|lts|ltrs|litres|liters)$/.test(unit)) return "ltr";
  return "";
}

function normalizeUnit(text) {
  const match = String(text || "").trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/);
  if (!match) return String(text).trim();
  const unit = normalizeUnitToken(match[2] || "");
  return unit ? `${match[1]} ${unit}` : String(text).trim();
}

function formatNumber(value) {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

function formatPcs(count) {
  return count === 1 ? "1 pc" : `${count} pcs`;
}

function parsePcsFromName(name) {
  const n = String(name || "");
  const ranged = n.match(RANGED_PCS_RE);
  if (ranged) return { min: Number(ranged[1]), max: Number(ranged[2]) };
  const single = n.match(PCS_RE);
  if (single) return { min: Number(single[1]), max: Number(single[1]) };
  return null;
}

function parseUnitFromName(name) {
  const match = String(name || "").match(TOKEN_RE);
  if (!match || /\bpcs?\b/i.test(match[2])) return null;
  const unit = normalizeUnitToken(match[2]);
  if (!unit) return null;
  return { value: Number(match[1]), unit };
}

function findVariant(variants, expression) {
  return variants.find((variant) => expression.test(String(variant).trim()));
}

function deriveHalfFull(name, variants) {
  const halfVariant = findVariant(variants, /^half$/i);
  const fullVariant = findVariant(variants, /^full$/i);
  const result = {};

  const pcs = parsePcsFromName(name);
  if (pcs) {
    const fullText = pcs.min === pcs.max ? formatPcs(pcs.min) : `${pcs.min}-${pcs.max} pcs`;
    const halfCount = Math.max(1, Math.round((pcs.min + pcs.max) / 4));
    if (fullVariant) result[fullVariant] = fullText;
    if (halfVariant) result[halfVariant] = formatPcs(halfCount);
    return result;
  }

  const unit = parseUnitFromName(name);
  if (unit) {
    if (fullVariant) result[fullVariant] = `${formatNumber(unit.value)} ${unit.unit}`;
    if (halfVariant) result[halfVariant] = `${formatNumber(unit.value / 2)} ${unit.unit}`;
    return result;
  }

  return result;
}

export function derivePortions(name, prices = {}, _categoryTitle = "") {
  const input = prices && typeof prices === "object" && !Array.isArray(prices) ? prices : {};
  const variants = Object.keys(input);
  if (variants.length === 0) return {};

  const unitVariants = variants.filter((variant) => UNIT_VARIANT_RE.test(String(variant).trim()));
  if (unitVariants.length > 0) {
    return Object.fromEntries(unitVariants.map((variant) => [variant, normalizeUnit(variant)]));
  }

  const isHalfFull =
    findVariant(variants, /^half$/i) !== undefined || findVariant(variants, /^full$/i) !== undefined;
  if (!isHalfFull) return {};

  return deriveHalfFull(name, variants);
}

export function portionFor(item, variant, categoryTitle = "") {
  const explicit = item?.portions?.[variant];
  if (explicit) return explicit;
  const derived = derivePortions(item?.name, item?.prices, categoryTitle);
  return derived[variant] || "";
}

export function portionMapFor(item, categoryTitle = "") {
  return {
    ...derivePortions(item?.name, item?.prices, categoryTitle),
    ...(item?.portions || {}),
  };
}