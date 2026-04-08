import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import {
  Alert,
  FlatList,
  ImageBackground,
  Image,
  Animated,
  type ImageSourcePropType,
  KeyboardAvoidingView,
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
import { getMenuImageByFileName, getMenuItemImage } from "@/utils/get-menu-item-image";

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
    image: getMenuImageByFileName("Chicken butter masala combo.jpg"),
    title: "Curated Indian Flavors",
    subtitle: "Chef-crafted signatures with premium delivery finish.",
  },
  {
    image: getMenuImageByFileName("chicken-handi-biryani.jpg"),
    title: "Biryani And Tandoor Nights",
    subtitle: "Bold aromas and smoky textures delivered hot.",
  },
  {
    image: getMenuImageByFileName("Tandoori-Chicken.jpg"),
    title: "Smoky Tandoor Specials",
    subtitle: "Charred perfection with authentic spice layers.",
  },
];

const RESTAURANT_PHONE_LABEL = "+91 8420252042";
const RESTAURANT_PHONE_DIAL = "+918420252042";
const FALLBACK_IMAGE = require("@/assets/images/logo.jpeg");

function ResilientImage({
  primarySource,
  secondarySource,
  style,
  animateOnChange = false,
}: {
  primarySource: ImageSourcePropType;
  secondarySource?: ImageSourcePropType;
  style: any;
  animateOnChange?: boolean;
}) {
  const [source, setSource] = useState<ImageSourcePropType>(primarySource);
  const [step, setStep] = useState(0);
  const fade = useMemo(() => new Animated.Value(1), []);

  useEffect(() => {
    if (!animateOnChange) {
      setSource(primarySource);
      setStep(0);
      return;
    }

    fade.setValue(0);
    setSource(primarySource);
    setStep(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [animateOnChange, fade, primarySource]);

  return (
    <Animated.Image
      source={source}
      style={[style, animateOnChange && { opacity: fade }]}
      onError={() => {
        if (step === 0 && secondarySource) {
          setSource(secondarySource);
          setStep(1);
          return;
        }
        setSource(FALLBACK_IMAGE);
        setStep(2);
      }}
    />
  );
}

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
  const [loginDobDate, setLoginDobDate] = useState<Date | null>(null);
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
  const [isOrderingOpen, setIsOrderingOpen] = useState(true);
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountRate, setDiscountRate] = useState(0);

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
      } catch {
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

  useEffect(() => {
    if (!session) return;

    let isMounted = true;

    const loadOrderingStatus = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/shop/ordering-status`);
        if (!isMounted) return;
        setIsOrderingOpen(Boolean(response.data?.isOrderingOpen));
      } catch {
        if (!isMounted) return;
        setIsOrderingOpen(true);
      }
    };

    loadOrderingStatus();
    const intervalId = setInterval(loadOrderingStatus, 15000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [session]);

  useEffect(() => {
    if (!session) return;

    let isMounted = true;

    const loadOutletSettings = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/outlets/1/settings`);
        if (!isMounted) return;
        setDiscountEnabled(Boolean(response.data?.discountEnabled));
        setDiscountRate(Number(response.data?.discountRate || 0));
      } catch {
        if (!isMounted) return;
        setDiscountEnabled(false);
        setDiscountRate(0);
      }
    };

    loadOutletSettings();
    const intervalId = setInterval(loadOutletSettings, 15000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [session]);

  const activeCategoryData = useMemo(
    () => menuCategories.find((category) => category.id === activeCategory) ?? menuCategories[0],
    [activeCategory, menuCategories],
  );

  const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.totalPrice, 0), [cartItems]);
  const deliveryCharge = cartItems.length ? 20 : 0;
  const discountAmount = discountEnabled ? Number(((subtotal * discountRate) / 100).toFixed(2)) : 0;
  const grandTotal = Math.max(0, subtotal - discountAmount + deliveryCharge);
  const loginDob = useMemo(() => (loginDobDate ? formatDateOfBirth(loginDobDate) : ""), [loginDobDate]);

  const menuHeader = (
    <View>
      <View style={styles.header}>
        <Image source={require("@/assets/images/logo.jpeg")} style={styles.headerLogo} />
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>Chakhna By Kilo</Text>
          <Text style={styles.tagline}>By Kilo, By Choice, By Taste</Text>
        </View>
        <TouchableOpacity onPress={callRestaurant} style={styles.callIconBtn} activeOpacity={0.85}>
          <Ionicons name="call-outline" size={17} color="#F5EFE4" />
        </TouchableOpacity>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color="#F5EFE4" />
        </TouchableOpacity>
      </View>

      <View style={styles.heroWrap}>
        <ResilientImage primarySource={heroSlides[heroIndex].image} style={styles.heroImage} animateOnChange />
        <View style={styles.heroOverlayTop} />
        <View style={styles.heroOverlayBottom} />
        <View style={styles.heroContent}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Premium Dining At Home</Text>
            </View>
            <View style={styles.heroLivePill}>
              <View style={styles.heroLiveDot} />
              <Text style={styles.heroLiveText}>Live Kitchen</Text>
            </View>
          </View>
          <Text style={styles.heroEyebrow}>{heroSlides[heroIndex].title}</Text>
          <Text style={styles.heroTitle}>Crafted flavors with a luxury finish</Text>
          <Text style={styles.heroSubtitle}>{heroSlides[heroIndex].subtitle}</Text>
          <View style={styles.heroInfoRow}>
            <View style={styles.heroInfoPill}>
              <Ionicons name="star" size={13} color="#F3D48B" />
              <Text style={styles.heroInfoText}>4.8 Rating</Text>
            </View>
            <View style={styles.heroInfoPill}>
              <Ionicons name="time-outline" size={13} color="#F3D48B" />
              <Text style={styles.heroInfoText}>25-35 min</Text>
            </View>
            <View style={styles.heroInfoPill}>
              <Ionicons name="flame-outline" size={13} color="#F3D48B" />
              <Text style={styles.heroInfoText}>Hot & Fresh</Text>
            </View>
          </View>
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
              } catch {
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
              activeOpacity={0.86}
              style={[styles.categoryBtn, activeCategory === category.id && styles.categoryBtnActive]}>
              <Text style={[styles.categoryText, activeCategory === category.id && styles.categoryTextActive]}>{category.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === "dismissed") return;

    const pickedDate = selectedDate ?? (event.nativeEvent?.timestamp ? new Date(event.nativeEvent.timestamp) : undefined);
    if (pickedDate && !Number.isNaN(pickedDate.getTime())) setLoginDobDate(pickedDate);
  };

  const openDobPicker = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: loginDobDate ?? new Date(2000, 0, 1),
        mode: "date",
        maximumDate: new Date(),
        minimumDate: new Date(1900, 0, 1),
        onChange: (event, selectedDate) => {
          if (event.type !== "set") return;
          const pickedDate = selectedDate ?? (event.nativeEvent?.timestamp ? new Date(event.nativeEvent.timestamp) : undefined);
          if (pickedDate && !Number.isNaN(pickedDate.getTime())) {
            setLoginDobDate(pickedDate);
          }
        },
      });
      return;
    }

    setShowDobPicker((prev) => !prev);
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
    if (!isOrderingOpen) {
      Alert.alert("Ordering closed", "The shop is currently closed. Please try again later.");
      return;
    }

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

    try {
      const statusResponse = await axios.get(`${API_BASE_URL}/api/shop/ordering-status`);
      const backendOrderingOpen = Boolean(statusResponse.data?.isOrderingOpen);
      setIsOrderingOpen(backendOrderingOpen);
      if (!backendOrderingOpen) {
        Alert.alert("Ordering closed", "The shop is currently closed. Please place your order when it reopens.");
        return;
      }
    } catch {
      if (!isOrderingOpen) {
        Alert.alert("Ordering closed", "The shop is currently closed. Please place your order when it reopens.");
        return;
      }
    }

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
    } catch (error: any) {
      if (error?.response?.status === 403) {
        Alert.alert("Ordering closed", error?.response?.data?.message || "Ordering is currently closed.");
      } else {
        Alert.alert("Order failed", error?.response?.data?.message || "Please try again.");
      }
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
      <ImageBackground source={heroSlides[0].image} style={[styles.loginContainer, { paddingTop: insets.top + 10, paddingHorizontal: horizontalSafePadding }]}>
        <View style={styles.loginOverlay} />
        <View style={styles.loginCard}>
          <Image source={require("@/assets/images/logo.jpeg")} style={styles.logo} />
          <Text style={styles.loginTitle}>Chakhna By Kilo</Text>
          <Text style={styles.loginSubtitle}>Premium food ordering in your pocket.</Text>
          <TextInput value={loginName} onChangeText={setLoginName} placeholder="Your name" placeholderTextColor="#999" style={styles.input} />
          <TextInput value={loginPhone} onChangeText={setLoginPhone} placeholder="Phone number" placeholderTextColor="#999" style={styles.input} keyboardType="phone-pad" />
          <TouchableOpacity style={styles.dobToggleBtn} onPress={openDobPicker} activeOpacity={0.86}>
            <Text style={styles.dobToggleLabel}>{showDobPicker ? "Hide DOB Calendar" : "Select Date of Birth"}</Text>
            <Text style={styles.dobToggleValue}>{loginDob || "Tap to choose"}</Text>
          </TouchableOpacity>
          {Platform.OS === "ios" && showDobPicker ? (
            <View style={styles.dobPickerWrap}>
              <DateTimePicker
                value={loginDobDate ?? new Date(2000, 0, 1)}
                mode="date"
                display="inline"
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
      </ImageBackground>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6, paddingHorizontal: horizontalSafePadding }]}>
      <FlatList
        data={!loadingMenu && !menuError ? activeCategoryData?.items || [] : []}
        keyExtractor={(item) => `${activeCategoryData?.id}-${item.id}`}
        ListHeaderComponent={menuHeader}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS !== "web"}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => {
          const variants = Object.keys(item.prices || {});
          const selectedVariant = variantSelections[item.name] || variants[0] || "Regular";
          const price = Number(item.prices?.[selectedVariant] || 0);
          const menuImage = getMenuItemImage(item.name, activeCategoryData?.title, item.image);

          return (
            <View style={styles.card}>
              <ResilientImage primarySource={menuImage} style={styles.cardImage} />
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
                <TouchableOpacity style={[styles.addBtn, !isOrderingOpen && styles.addBtnDisabled]} onPress={() => addToCart(item)} activeOpacity={0.88}>
                  <Text style={styles.addBtnText}>{isOrderingOpen ? "Add to Cart" : "Ordering Closed"}</Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          !loadingMenu && !menuError ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>{menuCategories.length ? "No items in this category" : "Loading menu..."}</Text>
              <Text style={styles.emptyStateText}>{menuCategories.length ? "Try another category." : "Please wait a moment."}</Text>
            </View>
          ) : null
        }
      />

      {cartItems.length > 0 && (
        <TouchableOpacity activeOpacity={0.88} style={[styles.checkoutPill, { left: horizontalSafePadding, right: horizontalSafePadding }]} onPress={() => setCartVisible(true)}>
          <Ionicons name="cart" size={16} color="#121212" />
          <Text style={styles.checkoutPillText}>Checkout Cart ({cartItems.length})</Text>
        </TouchableOpacity>
      )}

      <Modal visible={cartVisible} animationType="fade" transparent>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={insets.top + 12}>
          <View style={[styles.modalCard, { marginTop: insets.top + 12, paddingLeft: horizontalSafePadding, paddingRight: horizontalSafePadding }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Your Cart</Text>
                <Text style={styles.modalSubtitle}>Review items before placing the order.</Text>
              </View>
              <TouchableOpacity activeOpacity={0.82} onPress={() => setCartVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#D7CEC0" />
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
              {discountEnabled && discountAmount > 0 ? (
                <Text style={styles.billDiscount}>Discount ({discountRate}%): -Rs {discountAmount}</Text>
              ) : null}
              <Text style={styles.billText}>Delivery: Rs {deliveryCharge}</Text>
              <Text style={styles.billTotal}>Payable: Rs {grandTotal}</Text>
            </View>

            <TouchableOpacity style={[styles.placeBtn, !isOrderingOpen && styles.placeBtnDisabled]} disabled={placingOrder || !isOrderingOpen} onPress={placeOrder}>
              <Text style={styles.placeBtnText}>{placingOrder ? "Placing..." : isOrderingOpen ? "Place Order" : "Ordering Closed"}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
            {!isOrderingOpen && (
              <View style={[styles.orderingClosedBanner, { left: horizontalSafePadding, right: horizontalSafePadding, top: insets.top + 8 }]}>
                <Text style={styles.orderingClosedText}>Ordering is closed now. Menu browsing is available.</Text>
              </View>
            )}
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
    borderRadius: 20,
    overflow: "hidden",
    height: 240,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 5,
  },
  heroImage: { width: "100%", height: "100%" },
  heroOverlayTop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,10,10,0.22)" },
  heroOverlayBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 176,
    backgroundColor: "rgba(16,16,16,0.72)",
  },
  heroContent: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    gap: 7,
    backgroundColor: "rgba(18,18,18,0.28)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,239,228,0.16)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  heroBadgeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(212,160,23,0.2)",
    borderWidth: 1,
    borderColor: "rgba(243,212,139,0.54)",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  heroBadgeText: { color: "#F3D48B", fontSize: 10, fontWeight: "700", letterSpacing: 0.6 },
  heroLivePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(34,197,94,0.16)",
    borderWidth: 1,
    borderColor: "rgba(94,234,212,0.4)",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  heroLiveDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: "#34D399" },
  heroLiveText: { color: "#B4F6E0", fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },
  heroEyebrow: { color: "#E5D3A7", fontSize: 12, fontWeight: "600", letterSpacing: 0.3 },
  heroTitle: { color: "#F5EFE4", fontSize: 23, lineHeight: 29, fontWeight: "800", maxWidth: 300 },
  heroSubtitle: { color: "#DCD2C3", fontSize: 12.5, lineHeight: 18, maxWidth: 294 },
  heroInfoRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 2 },
  heroInfoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(243,212,139,0.4)",
    backgroundColor: "rgba(20,20,20,0.45)",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  heroInfoText: { color: "#EEE4D2", fontSize: 11, fontWeight: "600" },
  heroDotsRow: {
    position: "absolute",
    right: 12,
    bottom: 12,
    flexDirection: "row",
    gap: 7,
    backgroundColor: "rgba(8,8,8,0.34)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  heroDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.45)" },
  heroDotActive: { width: 20, backgroundColor: "#E3B447" },
  categoriesRow: { paddingHorizontal: 14, gap: 8, paddingBottom: 10, paddingTop: 2 },
  categoryBtn: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  categoryBtnActive: { backgroundColor: "rgba(139,0,0,0.9)", borderColor: "rgba(212,160,23,0.72)" },
  categoryText: { color: "#C6C0B6", fontSize: 12, letterSpacing: 0.1 },
  categoryTextActive: { color: "#F5EFE4", fontWeight: "700" },
  card: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", gap: 8, shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 5 }, shadowRadius: 8, elevation: 1 },
  cardImage: { width: "100%", height: 150, borderRadius: 10 },
  itemName: { color: "#F5EFE4", fontWeight: "700", fontSize: 15 },
  price: { color: "#D4A017", fontWeight: "700" },
  variantBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: "#242424", borderWidth: 1, borderColor: "#303030" },
  variantBtnActive: { borderColor: "#D4A017", backgroundColor: "rgba(212,160,23,0.2)" },
  variantText: { color: "#BDBDBD", fontSize: 12 },
  variantTextActive: { color: "#F5EFE4", fontWeight: "700" },
  addBtn: { backgroundColor: "#8B0000", borderRadius: 10, paddingVertical: 10 },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: "#F5EFE4", textAlign: "center", fontWeight: "700" },
  orderingClosedBanner: { position: "absolute", backgroundColor: "rgba(139, 0, 0, 0.9)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, zIndex: 2 },
  orderingClosedText: { color: "#F5EFE4", textAlign: "center", fontWeight: "600", fontSize: 12 },
  checkoutPill: { position: "absolute", bottom: 16, right: 16, left: 16, backgroundColor: "#D4A017", borderRadius: 999, paddingVertical: 11, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, shadowColor: "#9E7507", shadowOpacity: 0.14, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 2 },
  checkoutPillText: { color: "#121212", fontWeight: "800" },
  modalBackdrop: { flex: 1, justifyContent: "flex-start", backgroundColor: "rgba(0,0,0,0.42)" },
  modalCard: { backgroundColor: "#171717", borderRadius: 20, padding: 14, gap: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", shadowColor: "#000", shadowOpacity: 0.2, shadowOffset: { width: 0, height: 6 }, shadowRadius: 18, elevation: 8, maxHeight: "84%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  modalTitle: { color: "#F5EFE4", fontSize: 20, fontWeight: "700" },
  modalSubtitle: { color: "#AA9F91", fontSize: 12, marginTop: 3 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  cartRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  cartItemName: { color: "#F5EFE4", fontWeight: "600" },
  cartVariant: { color: "#A5A5A5", fontSize: 12, marginTop: 2 },
  qtyWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: { backgroundColor: "#2A2A2A", borderRadius: 8, width: 26, height: 26, justifyContent: "center", alignItems: "center" },
  qtyLabel: { color: "#F5EFE4", fontWeight: "700" },
  qtyValue: { color: "#F5EFE4" },
  billBox: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 10, gap: 3, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  billText: { color: "#D0D0D0" },
  billDiscount: { color: "#78D79C", fontWeight: "600" },
  billTotal: { color: "#D4A017", fontWeight: "700" },
  placeBtn: { backgroundColor: "#D4A017", borderRadius: 10, paddingVertical: 12, marginTop: 4 },
  placeBtnDisabled: { opacity: 0.6 },
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
