import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MenuItemCard } from "@/components/menu-item-card";
import { useCart } from "@/context/cart-context";
import { useSession } from "@/context/session-context";
import type { MenuCategory } from "@/types/menu";
import { API_BASE_URL } from "@/utils/api";

export default function CategoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const { cartItems, setCartVisible } = useCart();
  const insets = useSafeAreaInsets();
  const horizontalSafePadding = Math.max(14, Math.max(insets.left, insets.right) + 10);

  const cartTotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const category = categories.find((entry) => entry.id === id);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    const loadMenu = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await axios.get(`${API_BASE_URL}/api/menu`);
        const list = Array.isArray(response.data) ? response.data : [];
        if (cancelled) return;
        setCategories(list);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setError("Failed to load menu. Please check your internet connection.");
        setLoading(false);
      }
    };

    loadMenu();
    return () => {
      cancelled = true;
    };
  }, [id, session]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={[styles.header, { paddingHorizontal: horizontalSafePadding }]}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={20} color="#F5EFE4" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {category ? category.title.toUpperCase() : "Menu"}
          </Text>
          {category ? (
            <Text style={styles.headerSubtitle}>
              {category.items.length} {category.items.length === 1 ? "item" : "items"}
            </Text>
          ) : null}
        </View>
        <View style={styles.backBtnSpacer} />
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#D4A017" />
          <Text style={styles.stateText}>Loading {category?.title || ""}...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Ionicons name="warning-outline" size={40} color="#EF5350" />
          <Text style={styles.stateTitle}>Oops!</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => setLoading(true)} activeOpacity={0.88}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={category?.items || []}
          keyExtractor={(item) => `${category?.id}-${item.id}`}
          contentContainerStyle={{ paddingHorizontal: horizontalSafePadding, paddingTop: 12, paddingBottom: cartItems.length > 0 ? 90 : 40 }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={7}
          updateCellsBatchingPeriod={50}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <MenuItemCard item={item} categoryTitle={category?.title || ""} openCartOnAdd={false} />
          )}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={styles.stateTitle}>No items in this category</Text>
              <Text style={styles.stateText}>Please check back later.</Text>
            </View>
          }
        />
      )}

      {cartItems.length > 0 && (
        <TouchableOpacity
          activeOpacity={0.88}
          style={[styles.cartPill, { bottom: Math.max(16, insets.bottom + 8), left: horizontalSafePadding, right: horizontalSafePadding }]}
          onPress={() => {
            setCartVisible(true);
            router.back();
          }}>
          <Ionicons name="cart" size={16} color="#121212" />
          <Text style={styles.cartPillText}>View Cart ({cartItems.length})</Text>
          <View style={styles.cartPillTotalWrap}>
            <Text style={styles.cartPillTotal}>Rs {cartTotal}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 8 },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  backBtnSpacer: { width: 38 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#F5EFE4", fontSize: 16, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" },
  headerSubtitle: { color: "#A7A29A", fontSize: 11, marginTop: 2 },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 24, paddingVertical: 60 },
  stateTitle: { color: "#F5EFE4", fontSize: 16, fontWeight: "700", textAlign: "center" },
  stateText: { color: "#AFA79A", fontSize: 13, textAlign: "center", lineHeight: 19 },
  retryBtn: { backgroundColor: "#D4A017", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10, marginTop: 6 },
  retryBtnText: { color: "#121212", fontWeight: "700", textAlign: "center" },
  cartPill: { position: "absolute", backgroundColor: "#D4A017", borderRadius: 999, paddingVertical: 12, paddingHorizontal: 18, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, shadowColor: "#9E7507", shadowOpacity: 0.14, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 2 },
  cartPillText: { color: "#121212", fontWeight: "800", flexShrink: 1 },
  cartPillTotalWrap: { backgroundColor: "rgba(0,0,0,0.14)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  cartPillTotal: { color: "#121212", fontWeight: "700" },
});