import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ResilientImage } from "@/components/resilient-image";
import { useCart } from "@/context/cart-context";
import { Palette } from "@/constants/theme";
import type { MenuItem } from "@/types/menu";
import { getMenuItemImage } from "@/utils/get-menu-item-image";

export function MenuItemCard({ item, categoryTitle, openCartOnAdd = true }: { item: MenuItem; categoryTitle: string; openCartOnAdd?: boolean }) {
  const { variantSelections, setVariantSelections, isOrderingOpen, addToCart, favorites, toggleFavorite } = useCart();

  const variants = Object.keys(item.prices || {});
  const selectedVariant = variantSelections[item.name] || variants[0] || "Regular";
  const price = Number(item.prices?.[selectedVariant] || 0);
  const menuImage = getMenuItemImage(item.name, categoryTitle, item.image);
  const isItemUnavailable = item.available === false;
  const isFavorite = favorites.includes(item.name);

  return (
    <View style={[styles.card, isItemUnavailable && styles.cardUnavailable]}>
      <View style={styles.imageWrap}>
        <ResilientImage primarySource={menuImage} style={styles.cardImage} />
        <Pressable
          onPress={() => toggleFavorite(item.name)}
          hitSlop={8}
          style={[styles.favBtn, isFavorite && styles.favBtnActive]}>
          <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={16} color={isFavorite ? Palette.crimson : Palette.textMuted} />
        </Pressable>
        {isItemUnavailable ? (
          <View style={styles.unavailableBadge}>
            <Text style={styles.unavailableBadgeText}>Unavailable</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.price}>Rs {price}</Text>
        {variants.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled">
            {variants.map((variant) => (
              <TouchableOpacity
                key={variant}
                onPress={() => setVariantSelections((prev) => ({ ...prev, [item.name]: variant }))}
                style={[styles.variantBtn, selectedVariant === variant && styles.variantBtnActive]}>
                <Text style={[styles.variantText, selectedVariant === variant && styles.variantTextActive]}>{variant}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}
        <TouchableOpacity
          style={[styles.addBtn, (!isOrderingOpen || isItemUnavailable) && styles.addBtnDisabled]}
          onPress={() => addToCart(item, openCartOnAdd)}
          activeOpacity={0.88}
          disabled={!isOrderingOpen || isItemUnavailable}>
          <Text style={styles.addBtnText}>{!isOrderingOpen ? "Ordering Closed" : isItemUnavailable ? "Unavailable" : "Add to Cart"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.card,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: Palette.border,
    flexDirection: "row",
    gap: 10,
    shadowColor: "#8A6A52",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 1,
  },
  cardUnavailable: { opacity: 0.82, borderColor: "rgba(194,31,46,0.45)" },
  imageWrap: { width: 96, height: 96 },
  cardImage: { width: 96, height: 96, borderRadius: 10 },
  favBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,247,237,0.92)",
  },
  favBtnActive: { backgroundColor: "rgba(255,241,220,0.96)" },
  body: { flex: 1, justifyContent: "space-between", gap: 4, minWidth: 0 },
  itemName: { color: Palette.text, fontWeight: "700", fontSize: 14, lineHeight: 18 },
  price: { color: Palette.orange, fontWeight: "800" },
  unavailableBadge: {
    position: "absolute",
    left: 4,
    bottom: 4,
    backgroundColor: "rgba(194,31,46,0.16)",
    borderColor: "rgba(194,31,46,0.45)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  unavailableBadgeText: { color: Palette.crimson, fontSize: 10, fontWeight: "700" },
  variantBtn: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: Palette.cardSoft, borderWidth: 1, borderColor: Palette.borderStrong },
  variantBtnActive: { borderColor: Palette.crimson, backgroundColor: "rgba(194,31,46,0.1)" },
  variantText: { color: Palette.textMuted, fontSize: 11 },
  variantTextActive: { color: Palette.crimson, fontWeight: "700" },
  addBtn: { backgroundColor: Palette.crimson, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  addBtnDisabled: { opacity: 0.55 },
  addBtnText: { color: "#FFFFFF", textAlign: "center", fontWeight: "700", fontSize: 12.5 },
});