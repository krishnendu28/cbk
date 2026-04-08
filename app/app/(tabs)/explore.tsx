import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { io } from "socket.io-client";
import { API_BASE_URL } from "@/utils/api";
import { useSession } from "@/context/session-context";

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

const socket = io(API_BASE_URL, { autoConnect: true });
const steps = ["Preparing", "Ready", "Delivered"];

export default function OrdersScreen() {
  const { session, isHydrated } = useSession();
  const insets = useSafeAreaInsets();
  const horizontalSafePadding = Math.max(14, Math.max(insets.left, insets.right) + 10);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    async function loadOrders() {
      if (!session) {
        setOrders([]);
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/api/orders`);
        const all = Array.isArray(response.data) ? response.data : [];
        setOrders(all.filter((order: Order) => String(order.phone) === String(session.phone)));
      } catch {
        setOrders([]);
      }
    }

    loadOrders();

    const onNewOrder = (order: Order) => {
      if (!session || String(order.phone) !== String(session.phone)) return;
      setOrders((prev) => [order, ...prev.filter((item) => item._id !== order._id)]);
    };

    const onOrderUpdated = (order: Order) => {
      if (!session || String(order.phone) !== String(session.phone)) return;
      setOrders((prev) => prev.map((item) => (item._id === order._id ? order : item)));
    };

    const onOrderDeleted = ({ _id }: { _id: string }) => {
      setOrders((prev) => prev.filter((item) => item._id !== _id));
    };

    socket.on("new_order", onNewOrder);
    socket.on("order_updated", onOrderUpdated);
    socket.on("order_deleted", onOrderDeleted);

    return () => {
      socket.off("new_order", onNewOrder);
      socket.off("order_updated", onOrderUpdated);
      socket.off("order_deleted", onOrderDeleted);
    };
  }, [session]);

  const emptyText = useMemo(() => {
    if (!session) return "Login from Menu tab to view your orders.";
    return "No orders yet.";
  }, [session]);

  if (!isHydrated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingHorizontal: horizontalSafePadding, alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: "#D4A017", fontSize: 16, fontWeight: "600" }}>Loading session...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6, paddingHorizontal: horizontalSafePadding }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Order History</Text>
        <Text style={styles.subtitle}>Live kitchen status from admin panel</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 20, gap: 12 }}
        ListEmptyComponent={<Text style={styles.emptyText}>{emptyText}</Text>}
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
                <Ionicons name="checkmark-done-circle" size={18} color="#D4A017" />
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  header: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 12 },
  title: { color: "#F5EFE4", fontSize: 28, fontWeight: "700" },
  subtitle: { color: "#A5A5A5", marginTop: 4 },
  emptyText: { color: "#A5A5A5", textAlign: "center", marginTop: 18 },
  orderCard: { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "#2D2D2D", borderRadius: 14, padding: 12, gap: 9 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderId: { color: "#F5EFE4", fontWeight: "700" },
  statusPill: { backgroundColor: "rgba(139,0,0,0.45)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#D4A017" },
  statusText: { color: "#F5EFE4", fontSize: 12, fontWeight: "700" },
  meta: { color: "#B6B6B6", fontSize: 12 },
  savedText: { color: "#78D79C", fontSize: 12, fontWeight: "600", marginTop: 4 },
  progressRow: { flexDirection: "row", gap: 10 },
  progressStep: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#3A3A3A" },
  dotActive: { backgroundColor: "#D4A017" },
  stepLabel: { color: "#8D8D8D", fontSize: 11 },
  stepLabelActive: { color: "#F5EFE4" },
  itemsBox: { backgroundColor: "#1C1C1C", borderRadius: 8, padding: 8, gap: 3 },
  itemLine: { color: "#D8D8D8", fontSize: 12 },
});
