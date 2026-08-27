import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import {
  Alert,
  FlatList,
  ImageBackground,
  Image,
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
import { useRouter } from "expo-router";
import { API_BASE_URL } from "@/utils/api";
import { useSession } from "@/context/session-context";
import { useCart } from "@/context/cart-context";
import { AdBanner } from "@/components/admob/ad-banner";
import { useInterstitialAd } from "@/hooks/use-interstitial-ad";
import { MenuItemCard } from "@/components/menu-item-card";
import { FALLBACK_IMAGE, ResilientImage } from "@/components/resilient-image";
import { getMenuImageByFileName } from "@/utils/get-menu-item-image";
import type { MenuCategory } from "@/types/menu";

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

type CategoryCardMeta = {
  id: string;
  imageFile: string;
  bgColor: string;
};

const CATEGORY_CARD_META: Record<string, CategoryCardMeta> = {
  "non-veg-chakhna": { id: "non-veg-chakhna", imageFile: "Fish Fry.jpg", bgColor: "#FBE3E0" },
  "veg-chakhna": { id: "veg-chakhna", imageFile: "paneer-pakoda.jpg", bgColor: "#DFF2DC" },
  biryani: { id: "biryani", imageFile: "chicken-handi-biryani.jpg", bgColor: "#FDEBD0" },
  thali: { id: "thali", imageFile: "Curry-chawal.jpg", bgColor: "#DCE9F7" },
  combos: { id: "combos", imageFile: "Dal-Tadka-combo.jpg", bgColor: "#EADFF7" },
  "main-course": { id: "main-course", imageFile: "Double-egg-Curry.webp", bgColor: "#FAE8C8" },
  noodles: { id: "noodles", imageFile: "veg-nodd.jpg", bgColor: "#E1EDF8" },
  rice: { id: "rice", imageFile: "Mixed-Fried-Rice.webp", bgColor: "#FFF1D6" },
  rolls: { id: "rolls", imageFile: "egg-roll.jpg", bgColor: "#F8E7DB" },
  tandoor: { id: "tandoor", imageFile: "Tangdi-kebab.webp", bgColor: "#F4E1D4" },
  "roti-paratha": { id: "roti-paratha", imageFile: "Lachha-Paratha.jpg", bgColor: "#EDE3F2" },
  "chinese-chilli": { id: "chinese-chilli", imageFile: "Chilli-Chicken.jpg", bgColor: "#F9DFDF" },
  "ahuna-champaran": { id: "ahuna-champaran", imageFile: "Handi Mutton.jpg", bgColor: "#DDF0EB" },
};

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
  const { showIfLoaded: showCheckoutInterstitial } = useInterstitialAd();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cartItems, setCartItems, cartVisible, setCartVisible, isOrderingOpen, setIsOrderingOpen, updateQuantity } = useCart();
  const horizontalSafePadding = Math.max(14, Math.max(insets.left, insets.right) + 10);
  const [loginName, setLoginName] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginDobDate, setLoginDobDate] = useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [flatNo, setFlatNo] = useState("");
  const [roomFloor, setRoomFloor] = useState("");
  const [landmark, setLandmark] = useState("");
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [menuError, setMenuError] = useState("");
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountRate, setDiscountRate] = useState(0);

  const findMenuItemById = useCallback((menuItemId: number) => {
    for (const category of menuCategories) {
      const item = category.items.find((entry) => entry.id === menuItemId);
      if (item) {
        return item;
      }
    }

    return null;
  }, [menuCategories]);

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
    if (!menuCategories.length || !cartItems.length) return;

    const removedItems = cartItems.filter((cartItem) => {
      const menuItem = findMenuItemById(cartItem.menuItemId);
      return !menuItem || menuItem.available === false;
    });

    if (!removedItems.length) return;

    setCartItems((prev) => prev.filter((cartItem) => {
      const menuItem = findMenuItemById(cartItem.menuItemId);
      return menuItem && menuItem.available !== false;
    }));

    Alert.alert(
      "Cart updated",
      `${removedItems.map((item) => item.name).join(", ")} ${removedItems.length === 1 ? "was" : "were"} removed because ${removedItems.length === 1 ? "it is" : "they are"} now unavailable.`,
    );
  }, [cartItems, menuCategories, findMenuItemById, setCartItems]);

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

  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    const refreshMenu = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/menu`);
        const categories = Array.isArray(response.data) ? response.data : [];
        if (cancelled) return;
        setMenuCategories(categories);
        if (categories.length > 0 && !categories.some((c: MenuCategory) => c.id === activeCategory)) {
          setActiveCategory(categories[0].id);
        }
      } catch {
        // Silent failure - keep existing menu
      }
    };

    refreshMenu();
    const intervalId = setInterval(refreshMenu, 30000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [activeCategory, session]);

  const activeCategoryData = useMemo(
    () => menuCategories.find((category) => category.id === activeCategory) ?? menuCategories[0],
    [activeCategory, menuCategories],
  );

  const categoryCards = useMemo(() => {
    return menuCategories
      .filter((category) => CATEGORY_CARD_META[category.id])
      .map((category) => {
        const meta = CATEGORY_CARD_META[category.id];
        return {
          id: category.id,
          title: category.title,
          imageUrl: getMenuImageByFileName(meta.imageFile),
          bgColor: meta.bgColor,
          isSelected: activeCategory === category.id,
        };
      });
  }, [activeCategory, menuCategories]);

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
        <View style={styles.categoriesSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionDividerLine} />
            <Text style={styles.sectionTitle}>What’s on your mind ?</Text>
            <View style={styles.sectionDividerLine} />
          </View>

          <View style={styles.categoriesGrid}>
            {categoryCards.map((card) => (
              <TouchableOpacity
                key={card.id}
                onPress={() => {
                  setActiveCategory(card.id);
                  router.push(`/category/${card.id}`);
                }}
                activeOpacity={0.9}
                style={[styles.categoryCard, { backgroundColor: card.bgColor }, card.isSelected && styles.categoryCardActive]}>
                <View style={[styles.categoryCardEmblem, card.isSelected && styles.categoryCardEmblemActive]}>
                  <ResilientImage primarySource={card.imageUrl} secondarySource={FALLBACK_IMAGE} style={styles.categoryCardImage} />
                </View>
                <Text style={[styles.categoryCardTitle, card.isSelected && styles.categoryCardTitleActive]} numberOfLines={2}>
                  {card.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
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

  async function callRestaurant() {
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
  }

  const placeOrder = async () => {
    if (!session) return;

    const unavailableCartItem = cartItems.find((cartItem) => {
      const menuItem = findMenuItemById(cartItem.menuItemId);
      return !menuItem || menuItem.available === false;
    });

    if (unavailableCartItem) {
      Alert.alert("Item unavailable", `${unavailableCartItem.name} is currently unavailable. Please remove it from your cart.`);
      return;
    }

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
        subtotal,
        discountEnabled,
        discountRate,
        discountAmount,
        deliveryCharge,
        total: grandTotal,
      });

      Alert.alert("Order placed", "Your order is now in Preparing status.");
      setCartItems([]);
      setFlatNo("");
      setRoomFloor("");
      setLandmark("");
      setCartVisible(false);
      showCheckoutInterstitial();
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
        contentContainerStyle={{ paddingBottom: 190 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS !== "web"}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => <MenuItemCard item={item} categoryTitle={activeCategoryData?.title || ""} />}
        ListEmptyComponent={
          !loadingMenu && !menuError ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>{menuCategories.length ? "No items in this category" : "Loading menu..."}</Text>
              <Text style={styles.emptyStateText}>{menuCategories.length ? "Try another category." : "Please wait a moment."}</Text>
              <View style={styles.inlineAdWrap}>
                <AdBanner />
              </View>
            </View>
          ) : null
        }
      />

      <View
        style={[
          styles.adBannerWrap,
          {
            left: horizontalSafePadding,
            right: horizontalSafePadding,
            bottom: cartItems.length > 0 ? 70 : 14,
          },
        ]}
      >
        <AdBanner />
      </View>

      {cartItems.length > 0 && (
        <TouchableOpacity
          activeOpacity={0.88}
          style={[styles.checkoutPill, { left: horizontalSafePadding, right: horizontalSafePadding }]}
          onPress={() => {
            setCartVisible(true);
            showCheckoutInterstitial();
          }}
        >
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
  categoriesSection: { paddingTop: 2, paddingBottom: 4 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 10 },
  sectionDividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.16)" },
  sectionTitle: { color: "#F5EFE4", fontSize: 13, fontWeight: "800", letterSpacing: 1.6, textTransform: "uppercase", textAlign: "center" },
  categoriesGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10, paddingHorizontal: 2 },
  categoryCard: { width: "31.6%", borderRadius: 14, alignItems: "center", paddingVertical: 12, paddingHorizontal: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  categoryCardActive: { backgroundColor: "#1DAE56", borderColor: "rgba(255,255,255,0.4)", shadowColor: "#0E7A3B", shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 4 },
  categoryCardEmblem: { width: 66, height: 66, borderRadius: 33, overflow: "hidden", marginBottom: 8, borderWidth: 2, borderColor: "rgba(255,255,255,0.85)" },
  categoryCardEmblemActive: { borderColor: "#FFFFFF" },
  categoryCardImage: { width: "100%", height: "100%", resizeMode: "cover" },
  categoryCardTitle: { color: "#2E2E2E", fontSize: 10.5, fontWeight: "800", textAlign: "center", textTransform: "uppercase", letterSpacing: 0.4, minHeight: 28, lineHeight: 14 },
  categoryCardTitleActive: { color: "#FFFFFF" },
  orderingClosedBanner: { position: "absolute", backgroundColor: "rgba(139, 0, 0, 0.9)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, zIndex: 2 },
  orderingClosedText: { color: "#F5EFE4", textAlign: "center", fontWeight: "600", fontSize: 12 },
  adBannerWrap: { position: "absolute", alignItems: "center" },
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
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 54, gap: 8 },
  emptyStateTitle: { color: "#F5EFE4", fontSize: 16, fontWeight: "700" },
  emptyStateText: { color: "#AFA79A", fontSize: 13, textAlign: "center" },
  inlineAdWrap: { marginTop: 14, minHeight: 54, justifyContent: "center", alignItems: "center" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 100, paddingHorizontal: 24 },
  errorTitle: { color: "#EF5350", fontSize: 20, fontWeight: "700", marginTop: 12 },
  errorMessage: { color: "#D0D0D0", fontSize: 14, marginTop: 8, textAlign: "center", lineHeight: 20 },
  retryBtn: { backgroundColor: "#D4A017", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10, marginTop: 16 },
  retryBtnText: { color: "#121212", fontWeight: "700", textAlign: "center" },
});
