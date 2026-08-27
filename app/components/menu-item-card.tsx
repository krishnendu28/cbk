import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ResilientImage } from "@/components/resilient-image";
import { useCart } from "@/context/cart-context";
import type { MenuItem } from "@/types/menu";
import { getMenuItemImage } from "@/utils/get-menu-item-image";

export function MenuItemCard({ item, categoryTitle, openCartOnAdd = true }: { item: MenuItem; categoryTitle: string; openCartOnAdd?: boolean }) {
  const { variantSelections, setVariantSelections, isOrderingOpen, addToCart } = useCart();

  const variants = Object.keys(item.prices || {});
  const selectedVariant = variantSelections[item.name] || variants[0] || "Regular";
  const price = Number(item.prices?.[selectedVariant] || 0);
  const menuImage = getMenuItemImage(item.name, categoryTitle, item.image);
  const isItemUnavailable = item.available === false;

  return (
    <View style={[styles.card, isItemUnavailable && styles.cardUnavailable]}>
      <ResilientImage primarySource={menuImage} style={styles.cardImage} />
      {isItemUnavailable ? (
        <View style={styles.unavailableBadge}>
          <Text style={styles.unavailableBadgeText}>Unavailable</Text>
        </View>
      ) : null}
      <Text style={styles.itemName}>{item.name}</Text>
      <Text style={styles.price}>Rs {price}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {variants.map((variant) => (
          <TouchableOpacity
            key={variant}
            onPress={() => setVariantSelections((prev) => ({ ...prev, [item.name]: variant }))}
            style={[styles.variantBtn, selectedVariant === variant && styles.variantBtnActive]}>
            <Text style={[styles.variantText, selectedVariant === variant && styles.variantTextActive]}>{variant}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity
        style={[styles.addBtn, (!isOrderingOpen || isItemUnavailable) && styles.addBtnDisabled]}
        onPress={() => addToCart(item, openCartOnAdd)}
        activeOpacity={0.88}
        disabled={!isOrderingOpen || isItemUnavailable}>
        <Text style={styles.addBtnText}>{!isOrderingOpen ? "Ordering Closed" : isItemUnavailable ? "Unavailable" : "Add to Cart"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 8,
    elevation: 1,
  },
  cardUnavailable: { opacity: 0.82, borderColor: "rgba(239,83,80,0.45)" },
  cardImage: { width: "100%", height: 150, borderRadius: 10 },
  itemName: { color: "#F5EFE4", fontWeight: "700", fontSize: 15 },
  price: { color: "#D4A017", fontWeight: "700" },
  unavailableBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(239,83,80,0.16)",
    borderColor: "rgba(239,83,80,0.45)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  unavailableBadgeText: { color: "#FFB4AE", fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  variantBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: "#242424", borderWidth: 1, borderColor: "#303030" },
  variantBtnActive: { borderColor: "#D4A017", backgroundColor: "rgba(212,160,23,0.2)" },
  variantText: { color: "#BDBDBD", fontSize: 12 },
  variantTextActive: { color: "#F5EFE4", fontWeight: "700" },
  addBtn: { backgroundColor: "#8B0000", borderRadius: 10, paddingVertical: 10 },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: "#F5EFE4", textAlign: "center", fontWeight: "700" },
});