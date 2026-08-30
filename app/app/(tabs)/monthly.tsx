import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { Palette } from "@/constants/theme";
import { AdBanner } from "@/components/admob/ad-banner";
import {
  MONTHLY_BADGES,
  MONTHLY_CHINESE_SPECIAL,
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
  MONTHLY_PLAN_LABELS,
  MONTHLY_TAGLINE,
  MONTHLY_TITLE,
} from "@/constants/monthly";
import type { MonthlyPlan, MonthlyPlanType } from "@/constants/monthly";
import type { MonthlySubscription } from "@/types/monthly";
import { getMenuImageByFileName } from "@/utils/get-menu-item-image";

type PlanType = MonthlyPlanType;

const PLAN_OPTIONS: { key: PlanType; label: string }[] = [
  { key: "Veg", label: "🌿 Only Veg" },
  { key: "NonVeg", label: "🍗 Non-Veg + Veg" },
  { key: "OnlyNonVeg", label: "🍗 Only NonVeg" },
];

const MENU_TYPE_IMAGE: Record<PlanType, string> = {
  Veg: "Veg-Thali.jpg",
  NonVeg: "Fish Thali.webp",
  OnlyNonVeg: "Chicken-thali.jpeg",
};

const PLAN_CARDS: { key: PlanType; title: string; subtitle: string; color: string }[] = [
  { key: "Veg", title: "ONLY VEG MENU", subtitle: "Healthy & home-style", color: "#EA580C" },
  { key: "NonVeg", title: "NON-VEG + VEG MENU", subtitle: "Balanced mix menu", color: "#D97706" },
  { key: "OnlyNonVeg", title: "ONLY NON-VEG MENU", subtitle: "Premium non-veg every meal", color: "#C21F2E" },
];

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
    if (address.trim().length < 3) {
      Alert.alert("Address required", "Please enter your delivery address.");
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
      if (error?.response?.status === 404) {
        Alert.alert(
          "Subscription service unavailable",
          `The monthly plan service is being updated. Please call us on ${MONTHLY_CONTACT_LABEL} to enroll, or try again shortly.`,
          [
            { text: "Call Now", onPress: callRestaurant },
            { text: "OK" },
          ],
        );
        return;
      }
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
        <Text style={{ color: Palette.orange, fontSize: 16, fontWeight: "600" }}>Loading session...</Text>
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
                <Ionicons name="checkmark-circle" size={14} color={Palette.orange} />
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
                <Text style={styles.statusDetailLine}>Plan: {MONTHLY_PLAN_LABELS[activeSubscription.planType]}</Text>
                <Text style={styles.statusDetailLine}>Period: {formatDate(activeSubscription.startDate)} → {formatDate(activeSubscription.endDate)}</Text>
                <Text style={styles.statusDetailLine}>Delivery address: {activeSubscription.address}</Text>
              </View>
              <TouchableOpacity style={styles.callBtn} onPress={callRestaurant} activeOpacity={0.86}>
                <Ionicons name="call-outline" size={16} color={Palette.crimson} />
                <Text style={styles.callBtnText}>Need more meals? Call {MONTHLY_CONTACT_LABEL}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.enrollCard}>
            {subsLoading && (
              <View style={styles.checkingRow}>
                <ActivityIndicator size="small" color={Palette.orange} />
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
              placeholder="Enter your delivery address"
              placeholderTextColor="#888"
              style={styles.input}
              multiline
            />

            <Text style={styles.fieldLabel}>Menu plan</Text>
            <View style={styles.segmentRow}>
              {PLAN_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.segmentBtn, planType === option.key && styles.segmentBtnActive]}
                  onPress={() => setPlanType(option.key)}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.segmentBtnText, planType === option.key && styles.segmentBtnTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {MONTHLY_PLANS[planType].map((plan) => {
              const isSelected = selectedPlan?.id === plan.id;
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.planOption, isSelected && styles.planOptionSelected]}
                  onPress={() => {
                    setSelectedPlan(plan);
                    setMenuType(plan.planType);
                  }}
                  activeOpacity={0.9}
                >
                  <View style={styles.planOptionLeft}>
                    <Ionicons name={isSelected ? "radio-button-on" : "radio-button-off"} size={18} color={isSelected ? Palette.orange : "#C7B5A0"} />
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
                <ActivityIndicator color="#FFFFFF" />
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
          {PLAN_CARDS.map((card) => renderPlanCard(card.key, card.title, card.subtitle, card.color))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Monthly Menu Chart</Text>
          <Text style={styles.sectionSubtitle}>Choose a menu option to see its picture</Text>
        </View>
        <View style={styles.segmentRow}>
          {PLAN_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[styles.segmentBtn, menuType === option.key && styles.segmentBtnActive]}
              onPress={() => setMenuType(option.key)}
              activeOpacity={0.9}
            >
              <Text style={[styles.segmentBtnText, menuType === option.key && styles.segmentBtnTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.menuCard}>
          <View style={styles.menuImageWrap}>
            <Image source={getMenuImageByFileName(MENU_TYPE_IMAGE[menuType])} style={styles.menuImage} resizeMode="cover" />
            <Text style={styles.menuImageCaption}>{MONTHLY_PLAN_LABELS[menuType]} monthly menu</Text>
          </View>
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
        {menuType !== "Veg" && (
          <View style={styles.chineseCard}>
            <Text style={styles.chineseTitle}>🥡 Chinese Special — 3-day rotation</Text>
            {MONTHLY_CHINESE_SPECIAL.map((item) => (
              <Text key={item} style={styles.chineseRow}>
                • {item}
              </Text>
            ))}
          </View>
        )}
        <Text style={styles.menuNote}>{MONTHLY_NOTE}</Text>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>What You Get</Text>
        </View>
        <View style={styles.featuresCard}>
          {MONTHLY_FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Ionicons name="checkmark-done-circle" size={17} color={Palette.orange} />
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
              <Ionicons name="shield-checkmark" size={13} color={Palette.orange} />
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
              <Ionicons name="people" size={13} color={Palette.orange} />
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
  container: { flex: 1, backgroundColor: Palette.bg },
  header: { paddingTop: 10, paddingBottom: 6, gap: 10 },
  headerTopRow: { alignItems: "center", gap: 2 },
  brand: { color: Palette.text, fontSize: 24, fontWeight: "800", textAlign: "center" },
  brandBy: { color: Palette.orange, fontSize: 15, fontWeight: "600" },
  tagline: { color: Palette.textMuted, fontSize: 13, fontStyle: "italic" },
  titlePill: { backgroundColor: Palette.crimson, borderRadius: 8, alignSelf: "center", paddingHorizontal: 16, paddingVertical: 8 },
  titlePillText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800", letterSpacing: 0.6 },
  highlightsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 6 },
  highlightItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  highlightText: { color: Palette.text, fontSize: 11.5, fontWeight: "600" },
  highlightSeparator: { color: Palette.borderStrong, marginLeft: 4 },

  enrollCard: { backgroundColor: Palette.card, borderRadius: 16, borderWidth: 1, borderColor: Palette.border, padding: 14, gap: 8, marginTop: 12 },
  enrollTitle: { color: Palette.text, fontSize: 17, fontWeight: "700" },
  enrollSubtitle: { color: Palette.textMuted, fontSize: 12.5, lineHeight: 18 },
  fieldLabel: { color: Palette.textMuted, fontSize: 12, fontWeight: "600", marginTop: 4 },
  fieldBox: { backgroundColor: Palette.surface, borderRadius: 10, borderWidth: 1, borderColor: Palette.borderStrong, paddingHorizontal: 12, paddingVertical: 11 },
  fieldValue: { color: Palette.text, fontSize: 14 },
  input: {
    backgroundColor: Palette.surface,
    color: Palette.text,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 42,
    maxHeight: 90,
  },
  segmentRow: { flexDirection: "row", gap: 8, marginTop: 2 },
  segmentBtn: { flex: 1, backgroundColor: Palette.surface, borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: Palette.borderStrong, alignItems: "center", justifyContent: "center" },
  segmentBtnActive: { backgroundColor: Palette.cream, borderColor: Palette.crimson },
  segmentBtnText: { color: Palette.textMuted, fontSize: 11, fontWeight: "700", textAlign: "center" },
  segmentBtnTextActive: { color: Palette.crimson },
  planOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Palette.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  planOptionSelected: { borderColor: Palette.crimson, backgroundColor: Palette.cardSoft },
  planOptionLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  planOptionLabel: { color: Palette.text, fontSize: 13, fontWeight: "600" },
  planOptionPrice: { color: Palette.orange, fontSize: 14, fontWeight: "800" },
  subscribeBtn: { backgroundColor: Palette.crimson, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  subscribeBtnDisabled: { opacity: 0.55 },
  subscribeBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  enrollNote: { color: Palette.textMuted, fontSize: 11, textAlign: "center", lineHeight: 15 },

  statusCard: { backgroundColor: Palette.cardSoft, borderRadius: 16, borderWidth: 1, borderColor: Palette.orange, padding: 14, gap: 10, marginTop: 12 },
  statusHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusTitle: { color: Palette.text, fontSize: 17, fontWeight: "700" },
  statusPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1 },
  statusPillActive: { backgroundColor: "rgba(234,88,12,0.14)", borderColor: Palette.orange },
  statusPillClosed: { backgroundColor: Palette.cardSoft, borderColor: Palette.borderStrong },
  statusPillText: { color: Palette.text, fontSize: 12, fontWeight: "700" },
  statusBody: { gap: 10 },
  statusGrid: { flexDirection: "row", gap: 8 },
  statusMetric: { flex: 1, backgroundColor: Palette.surface, borderRadius: 12, padding: 10, alignItems: "center", borderWidth: 1, borderColor: Palette.border },
  statusMetricValue: { color: Palette.crimson, fontSize: 22, fontWeight: "800" },
  statusMetricLabel: { color: Palette.textMuted, fontSize: 11, marginTop: 2 },
  statusDetailBox: { backgroundColor: Palette.surface, borderRadius: 10, padding: 10, gap: 3 },
  statusDetailLine: { color: Palette.text, fontSize: 12.5 },
  checkingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  checkingText: { color: Palette.textMuted, fontSize: 12 },
  callBtn: { backgroundColor: Palette.surface, borderRadius: 10, paddingVertical: 11, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, borderWidth: 1, borderColor: Palette.borderStrong },
  callBtnText: { color: Palette.crimson, textAlign: "center", fontWeight: "700", fontSize: 13 },

  sectionHeader: { paddingTop: 22, paddingBottom: 10, gap: 3, alignItems: "center" },
  sectionTitle: { color: Palette.text, fontSize: 16, fontWeight: "800", letterSpacing: 0.4 },
  sectionSubtitle: { color: Palette.textMuted, fontSize: 12 },

  plansRow: { gap: 12 },
  planCard: { backgroundColor: Palette.card, borderRadius: 12, borderWidth: 1.5, borderColor: Palette.orange, overflow: "hidden" },
  planCardHeader: { paddingVertical: 10, alignItems: "center" },
  planCardHeaderText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800", letterSpacing: 0.8 },
  planCardSubtitle: { color: Palette.textMuted, fontSize: 11.5, textAlign: "center", paddingTop: 8 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: Palette.border },
  priceLabel: { color: Palette.text, fontSize: 12.5, flex: 1, paddingRight: 8 },
  priceValue: { color: Palette.orange, fontSize: 13.5, fontWeight: "800" },

  menuCard: { backgroundColor: Palette.card, borderRadius: 14, borderWidth: 1, borderColor: Palette.border, overflow: "hidden", marginTop: 10 },
  menuImageWrap: { width: "100%", aspectRatio: 16 / 9, backgroundColor: Palette.cardSoft },
  menuImage: { width: "100%", height: "100%" },
  menuImageCaption: { position: "absolute", left: 10, bottom: 9, color: "#FFFFFF", fontSize: 12.5, fontWeight: "800", backgroundColor: "rgba(62,31,18,0.62)", borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4, overflow: "hidden" },
  menuHeaderRow: { flexDirection: "row", backgroundColor: Palette.cream, paddingVertical: 9, paddingHorizontal: 10 },
  menuHeadText: { color: Palette.crimson, fontSize: 11.5, fontWeight: "800", letterSpacing: 0.4 },
  menuRow: { flexDirection: "row", paddingVertical: 9, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: Palette.border },
  menuColDay: { width: 74, fontSize: 11.5 },
  menuColMeal: { flex: 1, fontSize: 11.5 },
  menuDayText: { color: Palette.orange, fontWeight: "700" },
  menuMealText: { color: Palette.text },
  menuNote: { color: Palette.textMuted, fontSize: 11, textAlign: "center", marginTop: 8, fontStyle: "italic" },

  chineseCard: { backgroundColor: Palette.cardSoft, borderRadius: 12, borderWidth: 1, borderColor: Palette.borderStrong, padding: 12, gap: 5, marginTop: 10 },
  chineseTitle: { color: Palette.orange, fontSize: 12.5, fontWeight: "800" },
  chineseRow: { color: Palette.text, fontSize: 12, lineHeight: 17 },

  featuresCard: { backgroundColor: Palette.card, borderRadius: 14, borderWidth: 1, borderColor: Palette.border, padding: 12, gap: 9 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  featureText: { color: Palette.text, fontSize: 13 },

  badgeWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badgePill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Palette.surface, borderRadius: 999, borderWidth: 1, borderColor: Palette.borderStrong, paddingHorizontal: 11, paddingVertical: 7 },
  badgePillText: { color: Palette.text, fontSize: 11.5, fontWeight: "600" },

  footerCard: { backgroundColor: Palette.crimson, borderRadius: 14, padding: 16, alignItems: "center", gap: 6, marginTop: 8 },
  footerLocation: { color: "#FFFFFF", fontSize: 13.5, fontWeight: "700", textAlign: "center" },
  footerPhone: { color: "#F3B13B", fontSize: 15, fontWeight: "800" },
  footerQuote: { color: "#FFE3D6", fontSize: 12.5, fontStyle: "italic", marginTop: 2 },
  footerTagline: { color: "#FFD9C7", fontSize: 11.5 },
  inlineAdWrap: { minHeight: 54, justifyContent: "center", alignItems: "center", marginTop: 14 },
});