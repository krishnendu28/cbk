import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE_URL } from "@/utils/api";
import { useSession } from "@/context/session-context";
import { Palette } from "@/constants/theme";
import { AdBanner } from "@/components/admob/ad-banner";

type Order = {
  _id: string;
  customerName: string;
  phone: string;
  address: string;
  status: "Preparing" | "Ready" | "Delivered";
  discountRate?: number;
  discountAmount?: number;
  total: number;
  createdAt: string;
  items: { name: string; quantity: number; variant: string }[];
};

const steps = ["Preparing", "Ready", "Delivered"];

export default function OrdersScreen() {
  const { session, isHydrated } = useSession();
  const insets = useSafeAreaInsets();
  const horizontalSafePadding = Math.max(14, Math.max(insets.left, insets.right) + 10);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!session) {
      setOrders([]);
      return;
    }

    const sessionPhone = session.phone;
    let cancelled = false;

    async function pollOrders() {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/orders`);
        const all = Array.isArray(response.data) ? response.data : [];
        const filtered = all.filter((order: Order) => String(order.phone) === String(sessionPhone));
        if (!cancelled) setOrders(filtered);
      } catch {
        if (!cancelled) setOrders([]);
      }
    }

    pollOrders();
    const intervalId = setInterval(pollOrders, 8000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [session]);

  const emptyText = useMemo(() => {
    if (!session) return "Sign in on the Menu tab to view your orders.";
    if (session.guest) return "Sign in with your phone number to track your orders.";
    return "No orders yet.";
  }, [session]);

  if (!isHydrated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingHorizontal: horizontalSafePadding, alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: Palette.orange, fontSize: 16, fontWeight: "600" }}>Loading session...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6, paddingHorizontal: horizontalSafePadding }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Orders</Text>
        <Text style={styles.subtitle}>Track each order as it moves through the kitchen</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 20, gap: 12 }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{emptyText}</Text>
            <View style={styles.inlineAdWrap}>
              <AdBanner />
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const currentIndex = Math.max(0, steps.indexOf(item.status || "Preparing"));
          return (
            <View style={styles.orderCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.orderId}>#{String(item._id).slice(0, 8)}</Text>
                <View style={styles.statusPill}><Text style={styles.statusText}>{item.status}</Text></View>
              </View>
              <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>

              <View style={styles.progressRow}>
                {steps.map((step, idx) => (
                  <View key={step} style={styles.progressStep}>
                    <View style={[styles.dot, idx <= currentIndex && styles.dotActive]} />
                    <Text style={[styles.stepLabel, idx <= currentIndex && styles.stepLabelActive]}>{step}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.itemsBox}>
                {item.items?.map((orderItem, index) => (
                  <Text key={`${item._id}-${index}`} style={styles.itemLine}>
                    {orderItem.name} ({orderItem.variant}) x {orderItem.quantity}
                  </Text>
                ))}
              </View>

              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.meta}>Total: Rs {item.total}</Text>
                  {Number(item.discountAmount || 0) > 0 ? (
                    <Text style={styles.savedText}>
                      You saved Rs {Number(item.discountAmount || 0)}
                      {Number(item.discountRate || 0) > 0 ? ` (${Number(item.discountRate || 0)}%)` : ""}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="checkmark-done-circle" size={18} color={Palette.orange} />
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.bg },
  header: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 12 },
  title: { color: Palette.text, fontSize: 28, fontWeight: "700" },
  subtitle: { color: Palette.textMuted, marginTop: 4 },
  emptyWrap: { alignItems: "center", gap: 12, paddingTop: 18 },
  emptyText: { color: Palette.textMuted, textAlign: "center", marginTop: 18 },
  inlineAdWrap: { minHeight: 54, justifyContent: "center", alignItems: "center" },
  orderCard: { backgroundColor: Palette.card, borderWidth: 1, borderColor: Palette.border, borderRadius: 14, padding: 12, gap: 9 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderId: { color: Palette.text, fontWeight: "700" },
  statusPill: { backgroundColor: "rgba(194,31,46,0.1)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: Palette.crimson },
  statusText: { color: Palette.crimson, fontSize: 12, fontWeight: "700" },
  meta: { color: Palette.textMuted, fontSize: 12 },
  savedText: { color: Palette.orange, fontSize: 12, fontWeight: "700", marginTop: 4 },
  progressRow: { flexDirection: "row", gap: 10 },
  progressStep: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E0CDB2" },
  dotActive: { backgroundColor: Palette.orange },
  stepLabel: { color: Palette.textMuted, fontSize: 11 },
  stepLabelActive: { color: Palette.text },
  itemsBox: { backgroundColor: Palette.cardSoft, borderRadius: 8, padding: 8, gap: 3 },
  itemLine: { color: Palette.text, fontSize: 12 },
});