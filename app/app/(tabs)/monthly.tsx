import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE_URL } from "@/utils/api";
import { useSession } from "@/context/session-context";
import { AdBanner } from "@/components/admob/ad-banner";
import {
  MONTHLY_BADGES,
  MONTHLY_CONTACT_DIAL,
  MONTHLY_CONTACT_LABEL,
  MONTHLY_FEATURES,
  MONTHLY_FOOTER_QUOTE,
  MONTHLY_HIGHLIGHTS,
  MONTHLY_LOCATION,
  MONTHLY_MENU,
  MONTHLY_NOTE,
  MONTHLY_PERFECT_FOR,
  MONTHLY_PLANS,
  MONTHLY_TAGLINE,
  MONTHLY_TITLE,
} from "@/constants/monthly";
import type { MonthlyPlan } from "@/constants/monthly";
import type { MonthlySubscription } from "@/types/monthly";

type PlanType = "Veg" | "NonVeg";

export default function MonthlyScreen() {
  const { session, isHydrated } = useSession();
  const insets = useSafeAreaInsets();
  const horizontalSafePadding = Math.max(14, Math.max(insets.left, insets.right) + 10);

  const [menuType, setMenuType] = useState<PlanType>("Veg");
  const [subs, setSubs] = useState<MonthlySubscription[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);

  const [address, setAddress] = useState("");
  const [planType, setPlanType] = useState<PlanType>("Veg");
  const [selectedPlan, setSelectedPlan] = useState<MonthlyPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshSubscriptions = useCallback(async () => {
    if (!session) return;
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/monthly/subscriptions?phone=${encodeURIComponent(session.phone)}`,
      );
      const rows = Array.isArray(response.data?.subscriptions) ? response.data.subscriptions : [];
      const primary = rows.filter((row: MonthlySubscription) => row.status === "Active");
      const others = rows.filter((row: MonthlySubscription) => row.status !== "Active");
      setSubs([...primary, ...others]);
    } catch {
      // keep existing list
    } finally {
      setSubsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      setSubs([]);
      return;
    }

    setSubsLoading(true);
    refreshSubscriptions();
    refreshTimerRef.current = setInterval(refreshSubscriptions, 15000);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [session, refreshSubscriptions]);

  useEffect(() => {
    setSelectedPlan(null);
  }, [planType]);

  const activeSubscription = useMemo(() => subs.find((row) => row.status === "Active") ?? null, [subs]);

  function formatDate(value?: string) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  async function callRestaurant() {
    try {
      const supported = await Linking.canOpenURL(`tel:${MONTHLY_CONTACT_DIAL}`);
      if (!supported) {
        Alert.alert("Call unavailable", `Please call ${MONTHLY_CONTACT_LABEL}`);
        return;
      }
      await Linking.openURL(`tel:${MONTHLY_CONTACT_DIAL}`);
    } catch {
      Alert.alert("Call unavailable", `Please call ${MONTHLY_CONTACT_LABEL}`);
    }
  }

  async function handleSubscribe() {
    if (!session) return;

    const subscriptionName = session.name.trim();
    const subscriptionPhone = session.phone.trim();

    if (!subscriptionName || !subscriptionPhone) {
      Alert.alert("Sign in required", "Please sign in from the Menu tab before subscribing.");
      return;
    }
    if (!selectedPlan) {
      Alert.alert("Select a plan", "Choose a meal plan to continue.");
      return;
    }
    if (address.trim().length < 5) {
      Alert.alert("Address required", "Please enter your full delivery address.");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}/api/monthly/subscriptions`, {
        name: subscriptionName,
        phone: subscriptionPhone,
        address: address.trim(),
        planType: selectedPlan.planType,
        meals: selectedPlan.meals,
      });
      Alert.alert(
        "Subscription received",
        `You have been enrolled for the ${selectedPlan.label} plan (Rs ${selectedPlan.price}/-). Our team will call you at ${subscriptionPhone} to confirm payment and delivery.`,
      );
      setAddress("");
      setSelectedPlan(null);
      await refreshSubscriptions();
    } catch (error: any) {
      Alert.alert("Subscription failed", error?.response?.data?.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function renderPlanCard(planTypeKey: PlanType, title: string, subtitle: string, color: string) {
    return (
      <View style={styles.planCard}>
        <View style={[styles.planCardHeader, { backgroundColor: color }]}>
          <Text style={styles.planCardHeaderText}>{title}</Text>
        </View>
        <Text style={styles.planCardSubtitle}>{subtitle}</Text>
        {MONTHLY_PLANS[planTypeKey].map((plan) => (
          <View key={plan.id} style={styles.priceRow}>
            <Text style={styles.priceLabel}>{plan.label}</Text>
            <Text style={styles.priceValue}>₹{plan.price}/-</Text>
          </View>
        ))}
      </View>
    );
  }

  if (!isHydrated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingHorizontal: horizontalSafePadding, alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: "#D4A017", fontSize: 16, fontWeight: "600" }}>Loading session...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6, paddingHorizontal: horizontalSafePadding }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.brand}>Chakhna <Text style={styles.brandBy}>By Kilo</Text></Text>
            <Text style={styles.tagline}>{MONTHLY_TAGLINE}</Text>
          </View>
          <View style={styles.titlePill}>
            <Text style={styles.titlePillText}>{MONTHLY_TITLE}</Text>
          </View>
          <View style={styles.highlightsRow}>
            {MONTHLY_HIGHLIGHTS.map((highlight, index) => (
              <View key={highlight} style={styles.highlightItem}>
                <Ionicons name="checkmark-circle" size={14} color="#78D79C" />
                <Text style={styles.highlightText}>{highlight}</Text>
                {index < MONTHLY_HIGHLIGHTS.length - 1 && <Text style={styles.highlightSeparator}>|</Text>}
              </View>
            ))}
          </View>
        </View>

        {activeSubscription ? (
          <View style={styles.statusCard}>
            <View style={styles.statusHeaderRow}>
              <Text style={styles.statusTitle}>Your Monthly Plan</Text>
              <View style={[styles.statusPill, activeSubscription.status === "Active" ? styles.statusPillActive : styles.statusPillClosed]}>
                <Text style={styles.statusPillText}>{activeSubscription.status}</Text>
              </View>
            </View>
            <View style={styles.statusBody}>
              <View style={styles.statusGrid}>
                <View style={styles.statusMetric}>
                  <Text style={styles.statusMetricValue}>{activeSubscription.mealsRemaining}</Text>
                  <Text style={styles.statusMetricLabel}>Meals left</Text>
                </View>
                <View style={styles.statusMetric}>
                  <Text style={styles.statusMetricValue}>{activeSubscription.mealsRedeemed}</Text>
                  <Text style={styles.statusMetricLabel}>Meals taken</Text>
                </View>
                <View style={styles.statusMetric}>
                  <Text style={styles.statusMetricValue}>{activeSubscription.mealsTotal}</Text>
                  <Text style={styles.statusMetricLabel}>Meals total</Text>
                </View>
              </View>
              <View style={styles.statusDetailBox}>
                <Text style={styles.statusDetailLine}>Plan: {activeSubscription.planType === "Veg" ? "Only Veg" : "Non-Veg + Veg"}</Text>
                <Text style={styles.statusDetailLine}>Period: {formatDate(activeSubscription.startDate)} → {formatDate(activeSubscription.endDate)}</Text>
                <Text style={styles.statusDetailLine}>Delivery address: {activeSubscription.address}</Text>
              </View>
              <TouchableOpacity style={styles.callBtn} onPress={callRestaurant} activeOpacity={0.86}>
                <Ionicons name="call-outline" size={16} color="#F5EFE4" />
                <Text style={styles.callBtnText}>Need more meals? Call {MONTHLY_CONTACT_LABEL}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.enrollCard}>
            {subsLoading && (
              <View style={styles.checkingRow}>
                <ActivityIndicator size="small" color="#D4A017" />
                <Text style={styles.checkingText}>Checking your subscription...</Text>
              </View>
            )}
            <Text style={styles.enrollTitle}>Enroll for Monthly Meals</Text>
            <Text style={styles.enrollSubtitle}>
              Tell us your name and address, pick a plan below and our team will confirm over a call.
            </Text>

            <Text style={styles.fieldLabel}>Name</Text>
            <View style={styles.fieldBox}>
              <Text style={styles.fieldValue}>{session?.name || "Sign in from the Menu tab"}</Text>
            </View>

            <Text style={styles.fieldLabel}>Phone</Text>
            <View style={styles.fieldBox}>
              <Text style={styles.fieldValue}>{session?.phone || "—"}</Text>
            </View>

            <Text style={styles.fieldLabel}>Delivery address</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Flat / Tower / Landmark"
              placeholderTextColor="#888"
              style={styles.input}
              multiline
            />

            <Text style={styles.fieldLabel}>Menu plan</Text>
            <View style={styles.segmentRow}>
              <TouchableOpacity
                style={[styles.segmentBtn, planType === "Veg" && styles.segmentBtnActive]}
                onPress={() => setPlanType("Veg")}
                activeOpacity={0.9}
              >
                <Text style={[styles.segmentBtnText, planType === "Veg" && styles.segmentBtnTextActive]}>Only Veg</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentBtn, planType === "NonVeg" && styles.segmentBtnActive]}
                onPress={() => setPlanType("NonVeg")}
                activeOpacity={0.9}
              >
                <Text style={[styles.segmentBtnText, planType === "NonVeg" && styles.segmentBtnTextActive]}>Non-Veg + Veg</Text>
              </TouchableOpacity>
            </View>

            {MONTHLY_PLANS[planType].map((plan) => {
              const isSelected = selectedPlan?.id === plan.id;
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.planOption, isSelected && styles.planOptionSelected]}
                  onPress={() => setSelectedPlan(plan)}
                  activeOpacity={0.9}
                >
                  <View style={styles.planOptionLeft}>
                    <Ionicons name={isSelected ? "radio-button-on" : "radio-button-off"} size={18} color={isSelected ? "#D4A017" : "#777"} />
                    <Text style={styles.planOptionLabel}>{plan.label}</Text>
                  </View>
                  <Text style={styles.planOptionPrice}>₹{plan.price}/-</Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.subscribeBtn, (!session || !selectedPlan) && styles.subscribeBtnDisabled]}
              onPress={handleSubscribe}
              disabled={!session || submitting}
              activeOpacity={0.88}
            >
              {submitting ? (
                <ActivityIndicator color="#121212" />
              ) : (
                <Text style={styles.subscribeBtnText}>Subscribe for Monthly Meals</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.enrollNote}>No advance payment needed here. Our team confirms your plan on call.</Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pricing Plans</Text>
        </View>
        <View style={styles.plansRow}>
          {renderPlanCard("Veg", "ONLY VEG MENU", "Healthy & home-style", "#1DAE56")}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Monthly Menu Chart</Text>
          <Text style={styles.sectionSubtitle}>As per weekly rotation</Text>
        </View>
        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[styles.segmentBtn, menuType === "Veg" && styles.segmentBtnActive]}
            onPress={() => setMenuType("Veg")}
            activeOpacity={0.9}
          >
            <Text style={[styles.segmentBtnText, menuType === "Veg" && styles.segmentBtnTextActive]}>Veg Menu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, menuType === "NonVeg" && styles.segmentBtnActive]}
            onPress={() => setMenuType("NonVeg")}
            activeOpacity={0.9}
          >
            <Text style={[styles.segmentBtnText, menuType === "NonVeg" && styles.segmentBtnTextActive]}>Non-Veg + Veg</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.menuCard}>
          <View style={styles.menuHeaderRow}>
            <Text style={[styles.menuColDay, styles.menuHeadText]}>Day</Text>
            <Text style={[styles.menuColMeal, styles.menuHeadText]}>Lunch</Text>
            <Text style={[styles.menuColMeal, styles.menuHeadText]}>Dinner</Text>
          </View>
          {MONTHLY_MENU[menuType].map((row) => (
            <View key={row.day} style={styles.menuRow}>
              <Text style={[styles.menuColDay, styles.menuDayText]}>{row.day}</Text>
              <Text style={[styles.menuColMeal, styles.menuMealText]}>{row.lunch}</Text>
              <Text style={[styles.menuColMeal, styles.menuMealText]}>{row.dinner}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.menuNote}>{MONTHLY_NOTE}</Text>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>What You Get</Text>
        </View>
        <View style={styles.featuresCard}>
          {MONTHLY_FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Ionicons name="checkmark-done-circle" size={17} color="#D4A017" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Badges</Text>
        </View>
        <View style={styles.badgeWrap}>
          {MONTHLY_BADGES.map((badge) => (
            <View key={badge} style={styles.badgePill}>
              <Ionicons name="shield-checkmark" size={13} color="#78D79C" />
              <Text style={styles.badgePillText}>{badge}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Perfect For</Text>
        </View>
        <View style={styles.badgeWrap}>
          {MONTHLY_PERFECT_FOR.map((item) => (
            <View key={item} style={styles.badgePill}>
              <Ionicons name="people" size={13} color="#F3D48B" />
              <Text style={styles.badgePillText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerLocation}>{MONTHLY_LOCATION}</Text>
          <TouchableOpacity onPress={callRestaurant} activeOpacity={0.86}>
            <Text style={styles.footerPhone}>Contact Us: {MONTHLY_CONTACT_LABEL}</Text>
          </TouchableOpacity>
          <Text style={styles.footerQuote}>{`"${MONTHLY_FOOTER_QUOTE}"`}</Text>
          <Text style={styles.footerTagline}>By Kilo ♥ By Choice ♥ By Taste</Text>
        </View>

        <View style={styles.inlineAdWrap}>
          <AdBanner />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  header: { paddingTop: 10, paddingBottom: 6, gap: 10 },
  headerTopRow: { alignItems: "center", gap: 2 },
  brand: { color: "#F5EFE4", fontSize: 24, fontWeight: "800", textAlign: "center" },
  brandBy: { color: "#D4A017", fontSize: 15, fontWeight: "600" },
  tagline: { color: "#A5A5A5", fontSize: 13, fontStyle: "italic" },
  titlePill: { backgroundColor: "#D4A017", borderRadius: 8, alignSelf: "center", paddingHorizontal: 16, paddingVertical: 8 },
  titlePillText: { color: "#121212", fontSize: 14, fontWeight: "800", letterSpacing: 0.6 },
  highlightsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 6 },
  highlightItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  highlightText: { color: "#B8E9C6", fontSize: 11.5, fontWeight: "600" },
  highlightSeparator: { color: "#4a5b50", marginLeft: 4 },

  enrollCard: { backgroundColor: "#171717", borderRadius: 16, borderWidth: 1, borderColor: "#2D2D2D", padding: 14, gap: 8, marginTop: 12 },
  enrollTitle: { color: "#F5EFE4", fontSize: 17, fontWeight: "700" },
  enrollSubtitle: { color: "#A5A5A5", fontSize: 12.5, lineHeight: 18 },
  fieldLabel: { color: "#D7CEC0", fontSize: 12, fontWeight: "600", marginTop: 4 },
  fieldBox: { backgroundColor: "#1C1C1C", borderRadius: 10, borderWidth: 1, borderColor: "#303030", paddingHorizontal: 12, paddingVertical: 11 },
  fieldValue: { color: "#F5EFE4", fontSize: 14 },
  input: {
    backgroundColor: "#1C1C1C",
    color: "#F5EFE4",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#303030",
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 42,
    maxHeight: 90,
  },
  segmentRow: { flexDirection: "row", gap: 8, marginTop: 2 },
  segmentBtn: { flex: 1, backgroundColor: "#1C1C1C", borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: "#303030", alignItems: "center" },
  segmentBtnActive: { backgroundColor: "#2B4A2E", borderColor: "#1DAE56" },
  segmentBtnText: { color: "#A5A5A5", fontSize: 13, fontWeight: "700" },
  segmentBtnTextActive: { color: "#D9F2DD" },
  planOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1C1C1C",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#303030",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  planOptionSelected: { borderColor: "#D4A017", backgroundColor: "#231C09" },
  planOptionLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  planOptionLabel: { color: "#F5EFE4", fontSize: 13, fontWeight: "600" },
  planOptionPrice: { color: "#D4A017", fontSize: 14, fontWeight: "800" },
  subscribeBtn: { backgroundColor: "#D4A017", borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  subscribeBtnDisabled: { opacity: 0.55 },
  subscribeBtnText: { color: "#121212", fontSize: 14, fontWeight: "800" },
  enrollNote: { color: "#8A8478", fontSize: 11, textAlign: "center", lineHeight: 15 },

  statusCard: { backgroundColor: "#14261A", borderRadius: 16, borderWidth: 1, borderColor: "#1DAE56", padding: 14, gap: 10, marginTop: 12 },
  statusHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusTitle: { color: "#F5EFE4", fontSize: 17, fontWeight: "700" },
  statusPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1 },
  statusPillActive: { backgroundColor: "rgba(29,174,86,0.2)", borderColor: "#1DAE56" },
  statusPillClosed: { backgroundColor: "rgba(255,255,255,0.08)", borderColor: "#666" },
  statusPillText: { color: "#F5EFE4", fontSize: 12, fontWeight: "700" },
  statusBody: { gap: 10 },
  statusGrid: { flexDirection: "row", gap: 8 },
  statusMetric: { flex: 1, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 10, alignItems: "center" },
  statusMetricValue: { color: "#78D79C", fontSize: 22, fontWeight: "800" },
  statusMetricLabel: { color: "#AACDB4", fontSize: 11, marginTop: 2 },
  statusDetailBox: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 10, gap: 3 },
  statusDetailLine: { color: "#D9E7DD", fontSize: 12.5 },
  checkingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  checkingText: { color: "#A5A5A5", fontSize: 12 },
  callBtn: { backgroundColor: "#1E3A28", borderRadius: 10, paddingVertical: 11, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#2A5B3B" },
  callBtnText: { color: "#F5EFE4", textAlign: "center", fontWeight: "700", fontSize: 13 },

  sectionHeader: { paddingTop: 22, paddingBottom: 10, gap: 3, alignItems: "center" },
  sectionTitle: { color: "#F5EFE4", fontSize: 16, fontWeight: "800", letterSpacing: 0.4 },
  sectionSubtitle: { color: "#8C8C8C", fontSize: 12 },

  plansRow: { gap: 12 },
  planCard: { backgroundColor: "#161616", borderRadius: 12, borderWidth: 1.5, borderColor: "#1DAE56", overflow: "hidden" },
  planCardHeader: { paddingVertical: 10, alignItems: "center" },
  planCardHeaderText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800", letterSpacing: 0.8 },
  planCardSubtitle: { color: "#9C9C9C", fontSize: 11.5, textAlign: "center", paddingTop: 8 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#262626" },
  priceLabel: { color: "#E6E6E6", fontSize: 12.5, flex: 1, paddingRight: 8 },
  priceValue: { color: "#D4A017", fontSize: 13.5, fontWeight: "800" },

  menuCard: { backgroundColor: "#171717", borderRadius: 14, borderWidth: 1, borderColor: "#2D2D2D", overflow: "hidden", marginTop: 10 },
  menuHeaderRow: { flexDirection: "row", backgroundColor: "#202A22", paddingVertical: 9, paddingHorizontal: 10 },
  menuHeadText: { color: "#B8E9C6", fontSize: 11.5, fontWeight: "800", letterSpacing: 0.4 },
  menuRow: { flexDirection: "row", paddingVertical: 9, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: "#232323" },
  menuColDay: { width: 74, fontSize: 11.5 },
  menuColMeal: { flex: 1, fontSize: 11.5 },
  menuDayText: { color: "#F3D48B", fontWeight: "700" },
  menuMealText: { color: "#D8D8D8" },
  menuNote: { color: "#8C8C8C", fontSize: 11, textAlign: "center", marginTop: 8, fontStyle: "italic" },

  featuresCard: { backgroundColor: "#171717", borderRadius: 14, borderWidth: 1, borderColor: "#2D2D2D", padding: 12, gap: 9 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  featureText: { color: "#E0E0E0", fontSize: 13 },

  badgeWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badgePill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#1C1C1C", borderRadius: 999, borderWidth: 1, borderColor: "#363636", paddingHorizontal: 11, paddingVertical: 7 },
  badgePillText: { color: "#DCD6CB", fontSize: 11.5, fontWeight: "600" },

  footerCard: { backgroundColor: "#153A2C", borderRadius: 14, padding: 16, alignItems: "center", gap: 6, marginTop: 8 },
  footerLocation: { color: "#E6F0E8", fontSize: 13.5, fontWeight: "700", textAlign: "center" },
  footerPhone: { color: "#FFD54F", fontSize: 15, fontWeight: "800" },
  footerQuote: { color: "#C8E0D1", fontSize: 12.5, fontStyle: "italic", marginTop: 2 },
  footerTagline: { color: "#A8C9B6", fontSize: 11.5 },
  inlineAdWrap: { minHeight: 54, justifyContent: "center", alignItems: "center", marginTop: 14 },
});