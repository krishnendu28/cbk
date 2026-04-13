import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { runPushDiagnostics } from "@/utils/push-diagnostics";

type DiagnosticsState = {
  appOwnership: string;
  platform: string;
  projectId: string;
  permissionStatus: string;
  token: string;
  tokenRegistered: boolean;
  backendRegisteredDevices: number | null;
  backendHealthy: boolean;
  backendMessage: string;
};

const initialState: DiagnosticsState = {
  appOwnership: "unknown",
  platform: "unknown",
  projectId: "",
  permissionStatus: "unknown",
  token: "",
  tokenRegistered: false,
  backendRegisteredDevices: null,
  backendHealthy: false,
  backendMessage: "Not checked yet",
};

export default function PushDiagnosticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [state, setState] = useState<DiagnosticsState>(initialState);

  const runCheck = useCallback(async () => {
    setError("");
    setLoading(true);

    try {
      const result = await runPushDiagnostics();
      setState(result);
    } catch (diagnosticError) {
      setError(diagnosticError instanceof Error ? diagnosticError.message : String(diagnosticError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    runCheck().catch(() => undefined);
  }, [runCheck]);

  const backendCountLabel =
    state.backendRegisteredDevices === null ? "Unavailable" : String(state.backendRegisteredDevices);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 }}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Push Diagnostics</Text>
          <Text style={styles.subtitle}>Checks token registration and backend health on this device.</Text>
        </View>
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={18} color="#F5EFE4" />
        </Pressable>
      </View>

      <View style={styles.card}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#D4A017" />
            <Text style={styles.statusText}>Running diagnostics...</Text>
          </View>
        ) : null}

        <Metric label="App ownership" value={state.appOwnership} />
        <Metric label="Platform" value={state.platform} />
        <Metric label="Expo project ID" value={state.projectId || "Not set"} />
        <Metric label="Notification permission" value={state.permissionStatus} />
        <Metric label="Token registered" value={state.tokenRegistered ? "Yes" : "No"} />
        <Metric label="Backend healthy" value={state.backendHealthy ? "Yes" : "No"} />
        <Metric label="Registered devices" value={backendCountLabel} />
        <Metric label="Expo push token" value={state.token ? `${state.token.slice(0, 18)}...` : "Not available"} mono />
        <Metric label="Backend message" value={state.backendMessage} />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          onPress={() => {
            setRefreshing(true);
            runCheck().catch(() => undefined);
          }}
          style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.85 }]}
          disabled={loading || refreshing}
        >
          <Text style={styles.refreshBtnText}>{refreshing ? "Refreshing..." : "Run Again"}</Text>
        </Pressable>
      </View>

      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>What you want to see</Text>
        <Text style={styles.tipText}>permission = granted, tokenRegistered = Yes, backendRegisteredDevices &gt; 0</Text>
      </View>
    </ScrollView>
  );
}

function Metric({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, mono && styles.metricValueMono]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#121212", paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  title: { color: "#F5EFE4", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "#A7A29A", marginTop: 4, lineHeight: 18 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#1E1E1E", borderWidth: 1, borderColor: "#2D2D2D" },
  card: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 14, gap: 10 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  statusText: { color: "#D4A017", fontWeight: "700" },
  metricRow: { gap: 3, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.08)" },
  metricLabel: { color: "#A7A29A", fontSize: 12 },
  metricValue: { color: "#F5EFE4", fontSize: 14, fontWeight: "700" },
  metricValueMono: { fontFamily: Platform.select({ ios: "Courier", android: "monospace", default: "monospace" }) },
  errorText: { color: "#F87171", marginTop: 6 },
  refreshBtn: { marginTop: 6, backgroundColor: "#D4A017", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  refreshBtnText: { color: "#121212", fontWeight: "800" },
  tipCard: { marginTop: 14, backgroundColor: "rgba(212,160,23,0.10)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(212,160,23,0.25)", padding: 12 },
  tipTitle: { color: "#F5EFE4", fontWeight: "800", marginBottom: 4 },
  tipText: { color: "#D4A017", lineHeight: 18 },
});