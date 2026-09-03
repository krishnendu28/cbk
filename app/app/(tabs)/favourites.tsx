import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { API_BASE_URL } from "@/utils/api";
import { Palette } from "@/constants/theme";
import { useCart } from "@/context/cart-context";
import { MenuItemCard } from "@/components/menu-item-card";
import type { MenuCategory } from "@/types/menu";

const MAKHANA_ITEM_ID = 900001;
const SPECIALS_CATEGORY: MenuCategory = {
  id: "dry-fruits",
  title: "Dry Fruits",
  items: [
    { id: MAKHANA_ITEM_ID, name: "Makhana Roasted 250gm", prices: { Premium: 350, Standard: 250 }, image: undefined },
    { id: MAKHANA_ITEM_ID + 1, name: "Kaju 1kg", prices: { "Medium Size": 1100, "Bigger Size": 1400 }, image: undefined },
    { id: MAKHANA_ITEM_ID + 2, name: "Almond 1kg", prices: { Standard: 1100, Premium: 1300 }, image: undefined },
    { id: MAKHANA_ITEM_ID + 3, name: "Kismis 1kg", prices: { Standard: 520, Premium: 700 }, image: undefined },
  ],
};

export default function FavouritesScreen() {
  const { favorites, toggleFavorite } = useCart();
  const insets = useSafeAreaInsets();
  const horizontalSafePadding = Math.max(14, Math.max(insets.left, insets.right) + 10);

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMenu = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/menu`);
      const data = Array.isArray(response.data) ? response.data : [];
      const merged = data.some((c: MenuCategory) => c.id === SPECIALS_CATEGORY.id)
        ? data
        : [...data, SPECIALS_CATEGORY];
      setCategories(merged);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const allItems = categories.flatMap((category) => category.items);
  const favouriteItems = allItems.filter((item) => favorites.includes(item.name));

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6, paddingHorizontal: horizontalSafePadding }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Favourites</Text>
        <Text style={styles.subtitle}>
          {favouriteItems.length > 0 ? `${favouriteItems.length} liked item${favouriteItems.length > 1 ? "s" : ""} · tap to view & order` : "Items you like will appear here."}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Palette.orange} />
          <Text style={styles.centerText}>Loading favourites...</Text>
        </View>
      ) : favouriteItems.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="heart-outline" size={40} color={Palette.borderStrong} />
          <Text style={styles.emptyTitle}>No favourites yet</Text>
          <Text style={styles.emptyText}>
            Tap the heart icon on any menu item to add it here. Your favourites sync automatically.
          </Text>
        </View>
      ) : (
        <FlatList
          data={favouriteItems}
          keyExtractor={(item) => `${item.id}-${item.name}`}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{ gap: 10, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <TouchableOpacity style={styles.favBtn} onPress={() => toggleFavorite(item.name)} hitSlop={8} activeOpacity={0.85}>
                <Ionicons name="heart" size={18} color={Palette.crimson} />
              </TouchableOpacity>
              <MenuItemCard item={item} categoryTitle="Favorites" openCartOnAdd />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.bg },
  header: { paddingTop: 10, paddingBottom: 14, gap: 4 },
  title: { color: Palette.text, fontSize: 24, fontWeight: "800" },
  subtitle: { color: Palette.textMuted, fontSize: 12.5 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  centerText: { color: Palette.textMuted, fontSize: 13 },
  emptyCard: { marginTop: 20, backgroundColor: Palette.card, borderRadius: 16, borderWidth: 1, borderColor: Palette.border, padding: 28, alignItems: "center", gap: 10 },
  emptyTitle: { color: Palette.text, fontSize: 17, fontWeight: "700" },
  emptyText: { color: Palette.textMuted, fontSize: 13, textAlign: "center", lineHeight: 20 },
  cardWrap: { flex: 1, maxWidth: "48.5%" },
  favBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
  },
});
