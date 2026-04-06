import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import {
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
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

type MenuItem = {
  id: number;
  name: string;
  prices: Record<string, number>;
  image?: string;
};

type MenuCategory = {
  id: string;
  title: string;
  items: MenuItem[];
};

type CartItem = {
  id: string;
  name: string;
  variant: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

const heroSlides = [
  {
    image: "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&cs=tinysrgb&w=1400&h=900&fit=crop",
    title: "Curated Indian Flavors",
    subtitle: "Chef-crafted signatures with premium delivery finish.",
  },
  {
    image: "https://images.pexels.com/photos/1624487/pexels-photo-1624487.jpeg?auto=compress&cs=tinysrgb&w=1400&h=900&fit=crop",
    title: "Biryani And Tandoor Nights",
    subtitle: "Bold aromas and smoky textures delivered hot.",
  },
  {
    image: "https://images.pexels.com/photos/9609850/pexels-photo-9609850.jpeg?auto=compress&cs=tinysrgb&w=1400&h=900&fit=crop",
    title: "Street Classics Reimagined",
    subtitle: "From quick bites to royal plates, all in one app.",
  },
];

const RESTAURANT_PHONE_LABEL = "+91 8420252042";
const RESTAURANT_PHONE_DIAL = "+918420252042";

function formatDateOfBirth(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function MenuScreen() {
  const { session, isHydrated, login, logout } = useSession();
  const insets = useSafeAreaInsets();
  const horizontalSafePadding = Math.max(14, Math.max(insets.left, insets.right) + 10);
  const [loginName, setLoginName] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginDobDate, setLoginDobDate] = useState<Date>(new Date(2000, 0, 1));
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [variantSelections, setVariantSelections] = useState<Record<string, string>>({});
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartVisible, setCartVisible] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [flatNo, setFlatNo] = useState("");
  const [roomFloor, setRoomFloor] = useState("");
  const [landmark, setLandmark] = useState("");
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [menuError, setMenuError] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadMenu() {
      setLoadingMenu(true);
      setMenuError("");
      try {
        const response = await axios.get(`${API_BASE_URL}/api/menu`);
        const categories = Array.isArray(response.data) ? response.data : [];
        setMenuCategories(categories);
        setMenuError("");
        if (categories.length > 0 && !categories.some((c: MenuCategory) => c.id === activeCategory)) {
          setActiveCategory(categories[0].id);
        }
      } catch (error) {
        setMenuCategories([]);
        setMenuError("Failed to load menu. Please check your internet connection.");
      } finally {
        setLoadingMenu(false);
      }
    }

    if (session) {
      loadMenu();
    }
  }, [activeCategory, session]);

  const activeCategoryData = useMemo(
    () => menuCategories.find((category) => category.id === activeCategory) ?? menuCategories[0],
    [activeCategory, menuCategories],
  );

  const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.totalPrice, 0), [cartItems]);
  const deliveryCharge = cartItems.length ? 20 : 0;
  const grandTotal = subtotal + deliveryCharge;
  const loginDob = useMemo(() => formatDateOfBirth(loginDobDate), [loginDobDate]);

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDobPicker(false);
    }

    if (event.type === "dismissed") {
      return;
    }

    if (selectedDate) {
      setLoginDobDate(selectedDate);
    }
  };

  const handleLogin = () => {
    if (!loginName.trim() || !loginPhone.trim() || !loginDob) {
      Alert.alert("Missing details", "Enter your name, phone number, and date of birth.");
      return;
    }
    login(loginName, loginPhone, loginDob);
  };

  const callRestaurant = async () => {
    const dialUrl = `tel:${RESTAURANT_PHONE_DIAL}`;
    try {
      const supported = await Linking.canOpenURL(dialUrl);
      if (!supported) {
        Alert.alert("Call unavailable", `Please call ${RESTAURANT_PHONE_LABEL}`);
        return;
      }
      await Linking.openURL(dialUrl);
    } catch {
      Alert.alert("Call unavailable", `Please call ${RESTAURANT_PHONE_LABEL}`);
    }
  };

  const addToCart = (item: MenuItem) => {
    const variants = Object.keys(item.prices || {});
    const selectedVariant = variantSelections[item.name] || variants[0] || "Regular";
    const selectedPrice = Number(item.prices?.[selectedVariant] || 0);

    setCartItems((prev) => {
      const existing = prev.find((cartItem) => cartItem.name === item.name && cartItem.variant === selectedVariant);
      if (existing) {
        return prev.map((cartItem) =>
          cartItem.id === existing.id
            ? {
                ...cartItem,
                quantity: cartItem.quantity + 1,
                totalPrice: (cartItem.quantity + 1) * cartItem.unitPrice,
              }
            : cartItem,
        );
      }

      return [
        ...prev,
        {
          id: `${item.name}-${selectedVariant}`,
          name: item.name,
          variant: selectedVariant,
          quantity: 1,
          unitPrice: selectedPrice,
          totalPrice: selectedPrice,
        },
      ];
    });
    setCartVisible(true);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: Math.max(0, item.quantity + delta),
                totalPrice: Math.max(0, item.quantity + delta) * item.unitPrice,
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const placeOrder = async () => {
    if (!session) return;

    if (!flatNo.trim() || !roomFloor.trim()) {
      Alert.alert("Address required", "Please add Flat No and Room/Floor.");
      return;
    }

    if (!cartItems.length) {
      Alert.alert("Cart empty", "Add items before checkout.");
      return;
    }

    setPlacingOrder(true);
    try {
      await axios.post(`${API_BASE_URL}/api/orders`, {
        customerName: session.name,
        phone: session.phone,
        dateOfBirth: session.dateOfBirth,
        address: `Flat: ${flatNo}, Room/Floor: ${roomFloor}${landmark.trim() ? `, Landmark: ${landmark}` : ""}`,
        items: cartItems,
        deliveryCharge,
        total: grandTotal,
      });

      Alert.alert("Order placed", "Your order is now in Preparing status.");
      setCartItems([]);
      setFlatNo("");
      setRoomFloor("");
      setLandmark("");
      setCartVisible(false);
    } catch {
      Alert.alert("Order failed", "Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (!isHydrated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingHorizontal: horizontalSafePadding, alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: "#D4A017", fontSize: 16, fontWeight: "600" }}>Loading session...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.loginContainer, { paddingTop: insets.top + 10, paddingHorizontal: horizontalSafePadding }]}>
        <Image source={{ uri: heroSlides[0].image }} style={styles.loginBg} />
        <View style={styles.loginOverlay} />
        <View style={styles.loginCard}>
          <Image source={require("@/assets/images/logo.jpeg")} style={styles.logo} />
          <Text style={styles.loginTitle}>Chakhna By Kilo</Text>
          <Text style={styles.loginSubtitle}>Premium food ordering in your pocket.</Text>
          <TextInput value={loginName} onChangeText={setLoginName} placeholder="Your name" placeholderTextColor="#999" style={styles.input} />
          <TextInput value={loginPhone} onChangeText={setLoginPhone} placeholder="Phone number" placeholderTextColor="#999" style={styles.input} keyboardType="phone-pad" />
          <TouchableOpacity style={styles.dobToggleBtn} onPress={() => setShowDobPicker((prev) => !prev)}>
            <Text style={styles.dobToggleLabel}>{showDobPicker ? "Hide DOB Calendar" : "Select Date of Birth"}</Text>
            <Text style={styles.dobToggleValue}>{loginDob}</Text>
          </TouchableOpacity>
          {showDobPicker ? (
            <View style={styles.dobPickerWrap}>
              <DateTimePicker
                value={loginDobDate}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={handleDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
              />
            </View>
          ) : null}
          <TouchableOpacity style={styles.callBtn} onPress={callRestaurant}>
            <Ionicons name="call-outline" size={16} color="#F5EFE4" />
            <Text style={styles.callBtnText}>Call Restaurant: {RESTAURANT_PHONE_LABEL}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
            <Text style={styles.loginBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6, paddingHorizontal: horizontalSafePadding }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.header}>
          <Image source={require("@/assets/images/logo.jpeg")} style={styles.headerLogo} />
          <View style={{ flex: 1 }}>
            <Text style={styles.brand}>Chakhna By Kilo</Text>
            <Text style={styles.tagline}>By Kilo, By Choice, By Taste</Text>
          </View>
          <TouchableOpacity onPress={callRestaurant} style={styles.callIconBtn}>
            <Ionicons name="call-outline" size={17} color="#F5EFE4" />
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={18} color="#F5EFE4" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroWrap}>
          <Image source={{ uri: heroSlides[heroIndex].image }} style={styles.heroImage} />
          <View style={styles.heroOverlayTop} />
          <View style={styles.heroOverlayBottom} />
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Premium Delivery Experience</Text>
            </View>
            <Text style={styles.heroEyebrow}>{heroSlides[heroIndex].title}</Text>
            <Text style={styles.heroTitle}>Crafted flavors, delivered with finesse</Text>
            <Text style={styles.heroSubtitle}>{heroSlides[heroIndex].subtitle}</Text>
          </View>
          <View style={styles.heroDotsRow}>
            {heroSlides.map((_, idx) => (
              <View key={`hero-dot-${idx}`} style={[styles.heroDot, idx === heroIndex && styles.heroDotActive]} />
            ))}
          </View>
        </View>

        {loadingMenu && (
          <View style={styles.loaderContainer}>
            <View style={styles.spinnerWrap}>
              <Ionicons name="reload" size={48} color="#D4A017" style={styles.spinner} />
            </View>
            <Text style={styles.loaderText}>Loading menu...</Text>
          </View>
        )}

        {menuError && !loadingMenu && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={40} color="#EF5350" />
            <Text style={styles.errorTitle}>Oops!</Text>
            <Text style={styles.errorMessage}>{menuError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => {
              setLoadingMenu(true);
              setMenuError("");
              async function retry() {
                try {
                  const response = await axios.get(`${API_BASE_URL}/api/menu`);
                  const categories = Array.isArray(response.data) ? response.data : [];
                  setMenuCategories(categories);
                  setMenuError("");
                  if (categories.length > 0 && !categories.some((c: MenuCategory) => c.id === activeCategory)) {
                    setActiveCategory(categories[0].id);
                  }
                } catch (error) {
                  setMenuCategories([]);
                  setMenuError("Failed to load menu. Please check your internet connection.");
                } finally {
                  setLoadingMenu(false);
                }
              }
              retry();
            }}>
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loadingMenu && !menuError && menuCategories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
            {menuCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                onPress={() => setActiveCategory(category.id)}
                style={[styles.categoryBtn, activeCategory === category.id && styles.categoryBtnActive]}>
                <Text style={[styles.categoryText, activeCategory === category.id && styles.categoryTextActive]}>{category.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {!loadingMenu && !menuError && menuCategories.length > 0 && (
        <FlatList
          data={activeCategoryData?.items || []}
          keyExtractor={(item) => `${activeCategoryData?.id}-${item.id}`}
          scrollEnabled={false}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item }) => {
            const variants = Object.keys(item.prices || {});
            const selectedVariant = variantSelections[item.name] || variants[0] || "Regular";
            const price = Number(item.prices?.[selectedVariant] || 0);

            return (
              <View style={styles.card}>
                <Image source={{ uri: item.image || heroSlides[0].image }} style={styles.cardImage} />
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
                <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item)}>
                  <Text style={styles.addBtnText}>Add to Cart</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
        )}
      </ScrollView>

      {cartItems.length > 0 && (
        <TouchableOpacity style={[styles.checkoutPill, { left: horizontalSafePadding, right: horizontalSafePadding }]} onPress={() => setCartVisible(true)}>
          <Ionicons name="cart" size={16} color="#121212" />
          <Text style={styles.checkoutPillText}>Checkout Cart ({cartItems.length})</Text>
        </TouchableOpacity>
      )}

      <Modal visible={cartVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { paddingLeft: horizontalSafePadding, paddingRight: horizontalSafePadding }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your Cart</Text>
              <TouchableOpacity onPress={() => setCartVisible(false)}>
                <Ionicons name="close" size={24} color="#F5EFE4" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 260 }} contentContainerStyle={{ gap: 10 }}>
              {cartItems.map((item) => (
                <View key={item.id} style={styles.cartRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartVariant}>{item.variant}</Text>
                  </View>
                  <View style={styles.qtyWrap}>
                    <Pressable onPress={() => updateQuantity(item.id, -1)} style={styles.qtyBtn}><Text style={styles.qtyLabel}>-</Text></Pressable>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <Pressable onPress={() => updateQuantity(item.id, 1)} style={styles.qtyBtn}><Text style={styles.qtyLabel}>+</Text></Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TextInput value={flatNo} onChangeText={setFlatNo} placeholder="Flat no" placeholderTextColor="#999" style={styles.input} />
            <TextInput value={roomFloor} onChangeText={setRoomFloor} placeholder="Room no / Floor" placeholderTextColor="#999" style={styles.input} />
            <TextInput value={landmark} onChangeText={setLandmark} placeholder="Nearby landmark (optional)" placeholderTextColor="#999" style={styles.input} />

            <View style={styles.billBox}>
              <Text style={styles.billText}>Subtotal: Rs {subtotal}</Text>
              <Text style={styles.billText}>Delivery: Rs {deliveryCharge}</Text>
              <Text style={styles.billTotal}>Payable: Rs {grandTotal}</Text>
            </View>

            <TouchableOpacity style={styles.placeBtn} disabled={placingOrder} onPress={placeOrder}>
              <Text style={styles.placeBtnText}>{placingOrder ? "Placing..." : "Place Order"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  loginContainer: { flex: 1, justifyContent: "center", padding: 16, backgroundColor: "#121212" },
  loginBg: { ...StyleSheet.absoluteFillObject },
  loginOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(18,18,18,0.75)" },
  loginCard: { backgroundColor: "rgba(20,20,20,0.92)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#2D2D2D" },
  logo: { width: 78, height: 78, alignSelf: "center", borderRadius: 39, marginBottom: 8 },
  loginTitle: { color: "#F5EFE4", fontSize: 24, fontWeight: "700", textAlign: "center" },
  loginSubtitle: { color: "#C5BFAF", textAlign: "center", marginBottom: 12 },
  input: { backgroundColor: "#1C1C1C", color: "#F5EFE4", borderRadius: 10, borderWidth: 1, borderColor: "#303030", paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  dobToggleBtn: { backgroundColor: "#1C1C1C", borderRadius: 10, borderWidth: 1, borderColor: "#303030", paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  dobToggleLabel: { color: "#F5EFE4", fontWeight: "600" },
  dobToggleValue: { color: "#D4A017", marginTop: 2, fontWeight: "700" },
  dobPickerWrap: { backgroundColor: "#1C1C1C", borderRadius: 10, borderWidth: 1, borderColor: "#303030", paddingHorizontal: 4, paddingVertical: 4, marginBottom: 8 },
  callBtn: { backgroundColor: "#1E3A28", borderRadius: 10, paddingVertical: 10, marginBottom: 8, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#2A5B3B" },
  callBtnText: { color: "#F5EFE4", textAlign: "center", fontWeight: "700" },
  loginBtn: { backgroundColor: "#D4A017", borderRadius: 10, paddingVertical: 11, marginTop: 2 },
  loginBtnText: { color: "#121212", textAlign: "center", fontWeight: "700" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, gap: 10 },
  headerLogo: { width: 42, height: 42, borderRadius: 21 },
  brand: { color: "#F5EFE4", fontSize: 16, fontWeight: "700" },
  tagline: { color: "#A7A29A", fontSize: 12 },
  callIconBtn: { backgroundColor: "#1E3A28", borderRadius: 18, padding: 8 },
  logoutBtn: { backgroundColor: "#8B0000", borderRadius: 18, padding: 8 },
  heroWrap: {
    marginHorizontal: 2,
    borderRadius: 18,
    overflow: "hidden",
    height: 228,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 8,
  },
  heroImage: { width: "100%", height: "100%" },
  heroOverlayTop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(14,14,14,0.26)" },
  heroOverlayBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 160,
    backgroundColor: "rgba(18,18,18,0.74)",
  },
  heroContent: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 18,
    gap: 6,
  },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(212,160,23,0.18)",
    borderWidth: 1,
    borderColor: "rgba(212,160,23,0.45)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroBadgeText: { color: "#F3D48B", fontSize: 10, fontWeight: "700", letterSpacing: 0.4 },
  heroEyebrow: { color: "#E5D3A7", fontSize: 12, fontWeight: "600" },
  heroTitle: { color: "#F5EFE4", fontSize: 22, lineHeight: 27, fontWeight: "800", maxWidth: 300 },
  heroSubtitle: { color: "#D6CEC0", fontSize: 12.5, lineHeight: 18, maxWidth: 290 },
  heroDotsRow: {
    position: "absolute",
    right: 12,
    top: 12,
    flexDirection: "row",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  heroDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.45)" },
  heroDotActive: { width: 18, backgroundColor: "#D4A017" },
  categoriesRow: { paddingHorizontal: 14, gap: 8, paddingBottom: 10 },
  categoryBtn: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#232323", borderWidth: 1, borderColor: "#303030" },
  categoryBtnActive: { backgroundColor: "#8B0000", borderColor: "#D4A017" },
  categoryText: { color: "#CBCBCB", fontSize: 12 },
  categoryTextActive: { color: "#F5EFE4", fontWeight: "700" },
  card: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#2D2D2D", gap: 8 },
  cardImage: { width: "100%", height: 150, borderRadius: 10 },
  itemName: { color: "#F5EFE4", fontWeight: "700", fontSize: 15 },
  price: { color: "#D4A017", fontWeight: "700" },
  variantBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: "#242424", borderWidth: 1, borderColor: "#303030" },
  variantBtnActive: { borderColor: "#D4A017", backgroundColor: "rgba(212,160,23,0.2)" },
  variantText: { color: "#BDBDBD", fontSize: 12 },
  variantTextActive: { color: "#F5EFE4", fontWeight: "700" },
  addBtn: { backgroundColor: "#8B0000", borderRadius: 10, paddingVertical: 10 },
  addBtnText: { color: "#F5EFE4", textAlign: "center", fontWeight: "700" },
  checkoutPill: { position: "absolute", bottom: 16, right: 16, left: 16, backgroundColor: "#D4A017", borderRadius: 999, paddingVertical: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  checkoutPillText: { color: "#121212", fontWeight: "800" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
  modalCard: { backgroundColor: "#171717", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 14, gap: 8, borderTopWidth: 1, borderColor: "#2C2C2C" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { color: "#F5EFE4", fontSize: 20, fontWeight: "700" },
  cartRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#202020", borderRadius: 10, padding: 10 },
  cartItemName: { color: "#F5EFE4", fontWeight: "600" },
  cartVariant: { color: "#A5A5A5", fontSize: 12 },
  qtyWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: { backgroundColor: "#2A2A2A", borderRadius: 6, width: 24, height: 24, justifyContent: "center", alignItems: "center" },
  qtyLabel: { color: "#F5EFE4", fontWeight: "700" },
  qtyValue: { color: "#F5EFE4" },
  billBox: { backgroundColor: "#1F1F1F", borderRadius: 10, padding: 10, gap: 3 },
  billText: { color: "#D0D0D0" },
  billTotal: { color: "#D4A017", fontWeight: "700" },
  placeBtn: { backgroundColor: "#D4A017", borderRadius: 10, paddingVertical: 12, marginTop: 4 },
  placeBtnText: { color: "#121212", textAlign: "center", fontWeight: "800" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 100 },
  spinnerWrap: { marginBottom: 16 },
  spinner: { ...(Platform.OS !== "web" && { textShadowColor: "rgba(0,0,0,0.2)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }) },
  loaderText: { color: "#D4A017", fontSize: 16, fontWeight: "600" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 100, paddingHorizontal: 24 },
  errorTitle: { color: "#EF5350", fontSize: 20, fontWeight: "700", marginTop: 12 },
  errorMessage: { color: "#D0D0D0", fontSize: 14, marginTop: 8, textAlign: "center", lineHeight: 20 },
  retryBtn: { backgroundColor: "#D4A017", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10, marginTop: 16 },
  retryBtnText: { color: "#121212", fontWeight: "700", textAlign: "center" },
});
