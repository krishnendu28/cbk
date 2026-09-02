import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { ResilientImage } from "@/components/resilient-image";
import { useCart } from "@/context/cart-context";
import { Palette } from "@/constants/theme";
import type { MenuItem } from "@/types/menu";
import { getMenuItemImage } from "@/utils/get-menu-item-image";

function referenceMru(price: number) {
  if (!price) return 0;
  return Math.max(price + 1, Math.round((price * 1.25) / 10) * 10);
}

export function MenuItemCard({ item, categoryTitle, openCartOnAdd = true }: { item: MenuItem; categoryTitle: string; openCartOnAdd?: boolean }) {
  const { variantSelections, setVariantSelections, isOrderingOpen, addToCart } = useCart();
  const [sheetOpen, setSheetOpen] = useState(false);

  const variants = Object.keys(item.prices || {});
  const selectedVariant = variantSelections[item.name] || variants[0] || "Regular";
  const price = Number(item.prices?.[selectedVariant] || 0);
  const menuImage = getMenuItemImage(item.name, categoryTitle, item.image);
  const isItemUnavailable = item.available === false;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setSheetOpen(true)}
        style={[styles.card, isItemUnavailable && styles.cardUnavailable]}>
        <View style={styles.imageWrap}>
          <ResilientImage primarySource={menuImage} style={styles.cardImage} />
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
      </TouchableOpacity>

      <MenuItemDetailSheet
        item={item}
        categoryTitle={categoryTitle}
        openCartOnAdd={openCartOnAdd}
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}

function MenuItemDetailSheet({
  item,
  categoryTitle,
  openCartOnAdd,
  visible,
  onClose,
}: {
  item: MenuItem;
  categoryTitle: string;
  openCartOnAdd: boolean;
  visible: boolean;
  onClose: () => void;
}) {
  const { variantSelections, setVariantSelections, isOrderingOpen, addToCart, favorites, toggleFavorite } = useCart();
  const insets = useSafeAreaInsets();
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (visible) setQty(1);
  }, [visible]);

  const variants = Object.keys(item.prices || {});
  const selectedVariant = variantSelections[item.name] || variants[0] || "Regular";
  const price = Number(item.prices?.[selectedVariant] || 0);
  const mru = referenceMru(price);
  const menuImage = getMenuItemImage(item.name, categoryTitle, item.image);
  const isItemUnavailable = item.available === false;
  const isFavorite = favorites.includes(item.name);
  const canOrder = isOrderingOpen && !isItemUnavailable;
  const total = price * qty;

  const handleAdd = () => {
    if (!canOrder) return;
    for (let i = 0; i < qty; i++) {
      addToCart(item, i === qty - 1 && openCartOnAdd);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.sheetBackdrop}>
        <TouchableOpacity style={styles.sheetScrim} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheetBox, { paddingBottom: Math.max(16, insets.bottom) }]}>
          <View style={styles.heroArea}>
            <ResilientImage primarySource={menuImage} secondarySource={require("@/assets/images/logo.jpeg")} style={styles.heroImage} />
            <TouchableOpacity activeOpacity={0.85} onPress={onClose} style={styles.closeBtn} hitSlop={6}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.sheetCard}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
              <Text style={styles.sheetTitle}>{item.name}</Text>

              <View style={styles.priceRow}>
                <View style={styles.priceBadge}>
                  <Text style={styles.priceBadgeText}>Rs {price}</Text>
                </View>
                {mru > price ? (
                  <Text style={styles.mruText}>Rs {mru}</Text>
                ) : null}
                <View style={{ flex: 1 }} />
                <Pressable onPress={() => toggleFavorite(item.name)} hitSlop={8} style={[styles.sheetFavBtn, isFavorite && styles.sheetFavBtnActive]}>
                  <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={20} color={isFavorite ? Palette.crimson : Palette.textMuted} />
                </Pressable>
              </View>

              <View style={styles.divider} />

              <Text style={styles.detailsHeading}>Details</Text>
              <Text style={styles.detailsBody}>
                {categoryTitle ? `${categoryTitle.trim()} · ` : ""}A freshly prepared portion of {item.name}
                {variants.length > 1 ? ` — pick your ${selectedVariant} size below.` : "."} Packed fresh and served with care.
              </Text>

              {variants.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.variantChips} keyboardShouldPersistTaps="handled">
                  {variants.map((variant) => (
                    <TouchableOpacity
                      key={variant}
                      onPress={() => setVariantSelections((prev) => ({ ...prev, [item.name]: variant }))}
                      style={[styles.sheetVariantBtn, selectedVariant === variant && styles.sheetVariantBtnActive]}>
                      <Text style={[styles.sheetVariantText, selectedVariant === variant && styles.sheetVariantTextActive]}>{variant}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : null}

              <View style={styles.divider} />
            </ScrollView>

            <View style={styles.actionBar}>
              <View style={styles.qtyPill}>
                <Pressable onPress={() => setQty((prev) => Math.max(1, prev - 1))} style={styles.qtyBtn} hitSlop={6}>
                  <Ionicons name="remove" size={16} color={Palette.text} />
                </Pressable>
                <Text style={styles.qtyValue}>{qty}</Text>
                <Pressable onPress={() => setQty((prev) => prev + 1)} style={styles.qtyBtn} hitSlop={6}>
                  <Ionicons name="add" size={16} color={Palette.text} />
                </Pressable>
              </View>
              <TouchableOpacity
                activeOpacity={0.88}
                disabled={!canOrder}
                onPress={handleAdd}
                style={[styles.sheetAddBtn, !canOrder && styles.sheetAddBtnDisabled]}>
                <Text style={styles.sheetAddBtnText}>
                  {!isOrderingOpen ? "Ordering Closed" : isItemUnavailable ? "Unavailable" : `Add ${qty} · Rs ${total}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
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

  sheetBackdrop: { flex: 1, backgroundColor: "rgba(30,15,8,0.5)", justifyContent: "flex-end" },
  sheetScrim: { flex: 1 },
  sheetBox: { height: "92%", backgroundColor: Palette.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  heroArea: { height: "34%", minHeight: 190, backgroundColor: Palette.cardSoft },
  heroImage: { width: "100%", height: "100%" },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20,10,5,0.55)",
  },
  sheetCard: { flex: 1, marginTop: -22, backgroundColor: Palette.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 18, paddingHorizontal: 18 },
  sheetTitle: { color: Palette.text, fontSize: 22, fontWeight: "800", textAlign: "left", lineHeight: 27 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  priceBadge: { backgroundColor: "rgba(234,88,12,0.14)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  priceBadgeText: { color: Palette.orange, fontWeight: "800", fontSize: 17 },
  mruText: { color: Palette.textMuted, fontSize: 13, textDecorationLine: "line-through", fontWeight: "600" },
  sheetFavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Palette.cardSoft,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  sheetFavBtnActive: { backgroundColor: "rgba(194,31,46,0.1)", borderColor: "rgba(194,31,46,0.4)" },
  divider: { height: 1, backgroundColor: Palette.border, marginVertical: 14 },
  detailsHeading: { color: Palette.text, fontSize: 14, fontWeight: "800", marginBottom: 6 },
  detailsBody: { color: Palette.textMuted, fontSize: 13, lineHeight: 20 },
  variantChips: { gap: 6, marginTop: 12 },
  sheetVariantBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: Palette.cardSoft, borderWidth: 1, borderColor: Palette.borderStrong },
  sheetVariantBtnActive: { borderColor: Palette.crimson, backgroundColor: "rgba(194,31,46,0.1)" },
  sheetVariantText: { color: Palette.textMuted, fontSize: 12 },
  sheetVariantTextActive: { color: Palette.crimson, fontWeight: "700" },
  actionBar: { flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: Palette.border, paddingTop: 12, paddingBottom: 4 },
  qtyPill: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: Palette.cardSoft, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 5, borderWidth: 1, borderColor: Palette.borderStrong },
  qtyBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: Palette.card, borderWidth: 1, borderColor: Palette.borderStrong },
  qtyValue: { minWidth: 34, textAlign: "center", color: Palette.text, fontWeight: "800", fontSize: 15 },
  sheetAddBtn: { flex: 1, backgroundColor: Palette.crimson, borderRadius: 999, paddingVertical: 14, alignItems: "center" },
  sheetAddBtnDisabled: { opacity: 0.55, backgroundColor: Palette.textMuted },
  sheetAddBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
});
