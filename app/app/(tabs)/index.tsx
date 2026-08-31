import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  ImageBackground,
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
import { Palette } from "@/constants/theme";
import { AdBanner } from "@/components/admob/ad-banner";
import { useInterstitialAd } from "@/hooks/use-interstitial-ad";
import { MenuItemCard } from "@/components/menu-item-card";
import { FALLBACK_IMAGE, ResilientImage } from "@/components/resilient-image";
import { getMenuImageByFileName, getMenuItemImage } from "@/utils/get-menu-item-image";
import type { MenuCategory, MenuItem } from "@/types/menu";

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

const MAKHANA_ITEM_ID = 900001;
const MAKHANA_IMAGE_URL =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Dried_lotus_seeds_snack.jpg/960px-Dried_lotus_seeds_snack.jpg";
const SPECIALS_CATEGORY: MenuCategory = {
  id: "specials",
  title: "Specials",
  items: [{ id: MAKHANA_ITEM_ID, name: "Makhana Roasted (200gm)", prices: { Regular: 199 } }],
};
const MAKHANA_ITEM: MenuItem = SPECIALS_CATEGORY.items[0];

const SELLER_GROUPS: {
  id: string;
  title: string;
  badge: string;
  badgeColor: string;
  items: { label: string; itemName: string }[];
}[] = [
  {
    id: "veg",
    title: "Vegetarian Bestsellers",
    badge: "VEG",
    badgeColor: Palette.orange,
    items: [
      { label: "Paneer Masala", itemName: "Paneer Butter Masala 8pcs" },
      { label: "Mushroom Masala", itemName: "Mushroom Masala" },
      { label: "Paneer Pakoda", itemName: "Paneer Pakoda 8pcs" },
    ],
  },
  {
    id: "nonveg",
    title: "Non-Veg Bestsellers",
    badge: "NON-VEG",
    badgeColor: Palette.crimson,
    items: [
      { label: "Handi Mutton", itemName: "Handi Mutton 250gm" },
      { label: "Handi Chicken", itemName: "Handi Chicken 250gm" },
      { label: "Chicken 65", itemName: "Chicken 65/69 8pc" },
      { label: "Chicken Lollipop", itemName: "Chicken Lollipop 8pcs" },
    ],
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
  specials: { id: "specials", imageFile: "Kashmiri-Pulao.jpg", bgColor: "#FCEEDC" },
};

const RESTAURANT_PHONE_LABEL = "+91 8420252042";
const RESTAURANT_PHONE_DIAL = "+918420252042";

export default function MenuScreen() {
  const { session, isHydrated, login, loginAsGuest, logout } = useSession();
  const { showIfLoaded: showCheckoutInterstitial } = useInterstitialAd();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    cartItems,
    setCartItems,
    cartVisible,
    setCartVisible,
    isOrderingOpen,
    setIsOrderingOpen,
    addToCart,
    updateQuantity,
    deliveryCharge,
    etaMinutes,
    orderWindows,
    firstOrderDiscountEnabled,
    firstOrderDiscountRate,
    isFirstOrder,
    markFirstOrderUsed,
    promoRate,
    promoActive,
    promoCode,
    validatePromoCode,
  } = useCart();
  const horizontalSafePadding = Math.max(14, Math.max(insets.left, insets.right) + 10);
  const [loginName, setLoginName] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [flatRoom, setFlatRoom] = useState("");
  const [landmark, setLandmark] = useState("");
  const [instructions, setInstructions] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [profileVisible, setProfileVisible] = useState(false);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [menuError, setMenuError] = useState("");

  const findMenuItemById = useCallback((menuItemId: number) => {
    for (const category of menuCategories) {
      const item = category.items.find((entry) => entry.id === menuItemId);
      if (item) {
        return item;
      }
    }

    return null;
  }, [menuCategories]);

  const findMenuItemByName = useCallback((itemName: string) => {
    for (const category of menuCategories) {
      const item = category.items.find((entry) => entry.name === itemName);
      if (item) {
        return item;
      }
    }

    return null;
  }, [menuCategories]);

  const mergeSpecials = useCallback((categories: MenuCategory[]): MenuCategory[] => {
    if (categories.some((category) => category.id === SPECIALS_CATEGORY.id)) return categories;
    return [...categories, SPECIALS_CATEGORY];
  }, []);

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
        setMenuCategories(mergeSpecials(categories));
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
  }, [activeCategory, session, mergeSpecials]);

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

    let cancelled = false;

    const refreshMenu = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/menu`);
        const categories = Array.isArray(response.data) ? response.data : [];
        if (cancelled) return;
        setMenuCategories(mergeSpecials(categories));
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
  }, [activeCategory, session, mergeSpecials]);

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
  const deliveryChargeForCart = cartItems.length ? deliveryCharge : 0;
  const firstOrderDiscount =
    firstOrderDiscountEnabled && isFirstOrder ? Number(((subtotal * firstOrderDiscountRate) / 100).toFixed(2)) : 0;
  const promoApplied = validatePromoCode(promoInput);
  const promoDiscount = promoApplied ? Number(((subtotal * promoRate) / 100).toFixed(2)) : 0;
  const totalDiscount = firstOrderDiscount + promoDiscount;
  const grandTotal = Math.max(0, subtotal - totalDiscount + deliveryChargeForCart);

  const timingLabel = useMemo(() => {
    const windows = Array.isArray(orderWindows) && orderWindows.length
      ? orderWindows.filter((window) => window?.active !== false).map((window) => window?.label || `${window?.start || ""}–${window?.end || ""}`).filter(Boolean)
      : [];
    return windows.join("  ·  ");
  }, [orderWindows]);

  const menuHeader = (
    <View>
      <View style={styles.header}>
        <Image source={require("@/assets/images/logo.jpeg")} style={styles.headerLogo} />
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>Chakhna By Kilo</Text>
          <Text style={styles.tagline}>By Kilo, By Choice, By Taste</Text>
        </View>
        <TouchableOpacity onPress={() => setProfileVisible(true)} style={styles.profileBtn} activeOpacity={0.85}>
          <Ionicons name="person-circle-outline" size={28} color={Palette.crimson} />
        </TouchableOpacity>
      </View>

      <View style={styles.heroWrap}>
        <View style={styles.heroImageWrap}>
          <ResilientImage primarySource={heroSlides[heroIndex].image} style={styles.heroImage} animateOnChange />
          <View style={styles.heroLivePill}>
            <View style={styles.heroLiveDot} />
            <Text style={styles.heroLiveText}>Live Kitchen</Text>
          </View>
          <View style={styles.heroDotsRow}>
            {heroSlides.map((_, idx) => (
              <View key={`hero-dot-${idx}`} style={[styles.heroDot, idx === heroIndex && styles.heroDotActive]} />
            ))}
          </View>
        </View>
        <View style={styles.heroContent}>
          <Text style={styles.heroEyebrow}>{heroSlides[heroIndex].title}</Text>
          <Text style={styles.heroTitle}>Crafted flavors with a luxury finish</Text>
          <Text style={styles.heroSubtitle}>{heroSlides[heroIndex].subtitle}</Text>
          <View style={styles.heroInfoRow}>
            <View style={styles.heroInfoPill}>
              <Ionicons name="star" size={13} color={Palette.orange} />
              <Text style={styles.heroInfoText}>4.8 Rating</Text>
            </View>
            <View style={styles.heroInfoPill}>
              <Ionicons name="time-outline" size={13} color={Palette.orange} />
              <Text style={styles.heroInfoText}>~{etaMinutes} min</Text>
            </View>
            <View style={styles.heroInfoPill}>
              <Ionicons name="flame-outline" size={13} color={Palette.orange} />
              <Text style={styles.heroInfoText}>Hot & Fresh</Text>
            </View>
          </View>
        </View>
      </View>

      {loadingMenu && (
        <View style={styles.loaderContainer}>
          <View style={styles.spinnerWrap}>
            <Ionicons name="reload" size={48} color={Palette.orange} style={styles.spinner} />
          </View>
          <Text style={styles.loaderText}>Loading menu...</Text>
        </View>
      )}

      {menuError && !loadingMenu && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={40} color={Palette.crimson} />
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorMessage}>{menuError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => {
            setLoadingMenu(true);
            setMenuError("");
            async function retry() {
              try {
                const response = await axios.get(`${API_BASE_URL}/api/menu`);
                const categories = Array.isArray(response.data) ? response.data : [];
                setMenuCategories(mergeSpecials(categories));
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
          {timingLabel ? (
            <View style={styles.timingStrip}>
              <Ionicons name="time-outline" size={14} color={Palette.crimson} />
              <Text style={styles.timingText}>{timingLabel}</Text>
            </View>
          ) : null}

          {firstOrderDiscountEnabled && isFirstOrder ? (
            <View style={styles.offersStrip}>
              <Ionicons name="gift-outline" size={14} color={Palette.crimson} />
              <Text style={styles.offersText}>First order! Get {firstOrderDiscountRate}% off on your first meal.</Text>
            </View>
          ) : null}

          <View style={styles.newLaunchCard}>
            <View style={styles.newLaunchBadge}>
              <Text style={styles.newLaunchBadgeText}>NEW LAUNCH</Text>
            </View>
            <View style={styles.newLaunchRow}>
              <View style={styles.newLaunchImageWrap}>
                <ResilientImage primarySource={{ uri: MAKHANA_IMAGE_URL }} secondarySource={FALLBACK_IMAGE} style={styles.newLaunchImage} />
                <View style={styles.newLaunchPricePill}>
                  <Text style={styles.newLaunchPriceText}>Rs {MAKHANA_ITEM.prices.Regular}</Text>
                </View>
              </View>
              <View style={styles.newLaunchBody}>
                <Text style={styles.newLaunchTitle}>Our New Product — Makhana</Text>
                <Text style={styles.newLaunchSubtitle}>{MAKHANA_ITEM.name} — premium roasted fox nuts, packed fresh.</Text>
                <TouchableOpacity
                  style={[styles.orderBtn, !isOrderingOpen && styles.disabledBtn]}
                  onPress={() => {
                    if (isOrderingOpen) addToCart(MAKHANA_ITEM);
                  }}
                  activeOpacity={0.88}
                  disabled={!isOrderingOpen}>
                  <Ionicons name="cart" size={14} color={Palette.crimson} />
                  <Text style={styles.orderBtnText}>Order Rs {MAKHANA_ITEM.prices.Regular}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

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

          <View style={styles.bestSellersWrap}>
            <View style={styles.bestSellersBanner}>
              <Text style={styles.bestSellersEyebrow}>HOT LIST</Text>
              <Text style={styles.bestSellersTitle}>Best Seller Items of the Restaurant</Text>
              <Text style={styles.bestSellersSubtitle}>Tap Order on any dish below to add it to your cart.</Text>
            </View>
            <View style={styles.sellerCardGrid}>
              {SELLER_GROUPS.flatMap((group) =>
                group.items.map((seller) => {
                  const menuItem = findMenuItemByName(seller.itemName);
                  const price = menuItem ? Number(Object.values(menuItem.prices || {})[0] || 0) : 0;
                  const image = getMenuItemImage(seller.itemName, "Main Course", menuItem?.image);
                  const isVeg = group.badge === "VEG";
                  return (
                    <View key={seller.itemName} style={styles.sellerImageCard}>
                      <View style={styles.sellerImageWrap}>
                        <ResilientImage primarySource={image} secondarySource={FALLBACK_IMAGE} style={styles.sellerImage} />
                        <View style={[styles.sellerImageBadge, { backgroundColor: isVeg ? Palette.orange : Palette.crimson }]}>
                          <Text style={styles.sellerImageBadgeText}>{group.badge}</Text>
                        </View>
                      </View>
                      <View style={styles.sellerImageBody}>
                        <Text style={styles.sellerImageName} numberOfLines={1}>{seller.label}</Text>
                        <Text style={styles.sellerImagePrice}>Rs {price}</Text>
                        <TouchableOpacity
                          style={[styles.sellerImageOrderBtn, (!isOrderingOpen || !menuItem) && styles.disabledBtn]}
                          onPress={() => {
                            if (menuItem) addToCart(menuItem);
                          }}
                          activeOpacity={0.85}
                          disabled={!isOrderingOpen || !menuItem}>
                          <Text style={styles.sellerImageOrderText}>Order</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }),
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const handleLogin = () => {
    const cleanedPhone = loginPhone.trim();
    if (!cleanedPhone) {
      Alert.alert("Phone required", "Please enter your phone number to continue.");
      return;
    }
    login({ name: loginName, phone: cleanedPhone });
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

    if (!flatRoom.trim()) {
      Alert.alert("Address required", "Please add your Flat / House number and room.");
      return;
    }

    if (!cartItems.length) {
      Alert.alert("Cart empty", "Add items before checkout.");
      return;
    }

    setPlacingOrder(true);
    try {
      await axios.post(`${API_BASE_URL}/api/orders`, {
        customerName: session.name || (session.guest ? "Guest" : ""),
        phone: session.phone,
        dateOfBirth: session.dateOfBirth,
        address: `Flat/Room: ${flatRoom}${landmark.trim() ? `, Landmark: ${landmark}` : ""}`,
        instructions: instructions.trim(),
        items: cartItems,
        subtotal,
        promoCode: promoInput.trim() || undefined,
        deliveryEtaMinutes: etaMinutes,
        total: grandTotal,
      });

      if (isFirstOrder) {
        markFirstOrderUsed();
      }
      Alert.alert("Order placed", "Your order is now in Preparing status.");
      setCartItems([]);
      setFlatRoom("");
      setLandmark("");
      setInstructions("");
      setPromoInput("");
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
        <Text style={{ color: Palette.orange, fontSize: 16, fontWeight: "600" }}>Loading session...</Text>
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
          <TextInput value={loginName} onChangeText={setLoginName} placeholder="Name (optional)" placeholderTextColor={Palette.textMuted} style={styles.input} />
          <TextInput value={loginPhone} onChangeText={setLoginPhone} placeholder="Phone number *" placeholderTextColor={Palette.textMuted} style={styles.input} keyboardType="phone-pad" />
          <TouchableOpacity style={styles.callBtn} onPress={callRestaurant}>
            <Ionicons name="call-outline" size={16} color={Palette.crimson} />
            <Text style={styles.callBtnText}>Call Restaurant: {RESTAURANT_PHONE_LABEL}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
            <Text style={styles.loginBtnText}>Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipBtn} onPress={loginAsGuest}>
            <Text style={styles.skipBtnText}>Browse Menu Without Login</Text>
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
          <Ionicons name="cart" size={16} color="#FFFFFF" />
          <Text style={styles.checkoutPillText}>Checkout Cart ({cartItems.length})</Text>
        </TouchableOpacity>
      )}

      <Modal visible={profileVisible} animationType="fade" transparent onRequestClose={() => setProfileVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.profileCard, { marginTop: insets.top + 12, paddingLeft: horizontalSafePadding, paddingRight: horizontalSafePadding }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Profile</Text>
                <Text style={styles.modalSubtitle}>
                  {session.guest
                    ? "Browsing as guest"
                    : session.phone
                      ? `${session.name || "Customer"} · ${session.phone}`
                      : "Not signed in"}
                </Text>
              </View>
              <TouchableOpacity activeOpacity={0.82} onPress={() => setProfileVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={Palette.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.profileRow} onPress={() => { setProfileVisible(false); callRestaurant(); }} activeOpacity={0.85}>
              <Ionicons name="call-outline" size={18} color={Palette.crimson} />
              <View style={{ flex: 1 }}>
                <Text style={styles.profileRowTitle}>Contact Restaurant</Text>
                <Text style={styles.profileRowSubtitle}>{RESTAURANT_PHONE_LABEL}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Palette.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.profileRow} onPress={() => setProfileVisible(false)} activeOpacity={0.85}>
              <Ionicons name="pricetag-outline" size={18} color={Palette.orange} />
              <View style={{ flex: 1 }}>
                <Text style={styles.profileRowTitle}>Coupons & Offers</Text>
                <Text style={styles.profileRowSubtitle}>
                  {promoActive && promoRate > 0
                    ? `${promoCode ? `Use code ${promoCode} · ` : ""}${promoRate}% OFF your next order`
                    : firstOrderDiscountEnabled && isFirstOrder
                      ? `First order ${firstOrderDiscountRate}% off`
                      : "No active offers right now"}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutRow}
              onPress={() => {
                setProfileVisible(false);
                logout();
              }}
              activeOpacity={0.85}>
              <Ionicons name="log-out-outline" size={18} color={Palette.crimson} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
                <Ionicons name="close" size={20} color={Palette.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 210 }} contentContainerStyle={{ gap: 10 }}>
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

            <TextInput value={flatRoom} onChangeText={setFlatRoom} placeholder="Flat / House no and Room" placeholderTextColor={Palette.textMuted} style={styles.input} />
            <TextInput value={landmark} onChangeText={setLandmark} placeholder="Nearby landmark (optional)" placeholderTextColor={Palette.textMuted} style={styles.input} />
            <TextInput value={instructions} onChangeText={setInstructions} placeholder="Instructions (e.g. less spicy, no onions)" placeholderTextColor={Palette.textMuted} style={styles.input} />
            <TextInput value={promoInput} onChangeText={setPromoInput} placeholder={promoActive && promoCode ? `Promo code (hint: ${promoCode})` : "Promo code (optional)"} placeholderTextColor={Palette.textMuted} style={styles.input} autoCapitalize="characters" />

            <View style={styles.billBox}>
              <Text style={styles.billText}>Subtotal: Rs {subtotal}</Text>
              {firstOrderDiscount > 0 ? (
                <Text style={styles.billDiscount}>First Order Discount ({firstOrderDiscountRate}%): -Rs {firstOrderDiscount}</Text>
              ) : null}
              {promoApplied ? (
                <Text style={styles.billDiscount}>Promo Applied ({promoRate}%): -Rs {promoDiscount}</Text>
              ) : null}
              <Text style={styles.billText}>Delivery: Rs {deliveryChargeForCart}</Text>
              <Text style={styles.billEta}>Estimated delivery: about {etaMinutes} min</Text>
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
  container: { flex: 1, backgroundColor: Palette.bg },
  loginContainer: { flex: 1, justifyContent: "center", padding: 16, backgroundColor: Palette.bg },
  loginOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,247,237,0.9)" },
  loginCard: { backgroundColor: Palette.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Palette.border },
  logo: { width: 78, height: 78, alignSelf: "center", borderRadius: 39, marginBottom: 8 },
  loginTitle: { color: Palette.text, fontSize: 24, fontWeight: "700", textAlign: "center" },
  loginSubtitle: { color: Palette.textMuted, textAlign: "center", marginBottom: 12 },
  input: { backgroundColor: Palette.surface, color: Palette.text, borderRadius: 10, borderWidth: 1, borderColor: Palette.borderStrong, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  callBtn: { backgroundColor: Palette.cardSoft, borderRadius: 10, paddingVertical: 10, marginBottom: 8, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, borderWidth: 1, borderColor: Palette.borderStrong },
  callBtnText: { color: Palette.crimson, textAlign: "center", fontWeight: "700" },
  loginBtn: { backgroundColor: Palette.crimson, borderRadius: 10, paddingVertical: 11, marginTop: 2 },
  loginBtnText: { color: "#FFFFFF", textAlign: "center", fontWeight: "700" },
  skipBtn: { borderRadius: 10, paddingVertical: 10, marginTop: 4, alignItems: "center" },
  skipBtnText: { color: Palette.orange, textAlign: "center", fontWeight: "700" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, gap: 10 },
  headerLogo: { width: 42, height: 42, borderRadius: 21 },
  brand: { color: Palette.text, fontSize: 16, fontWeight: "700" },
  tagline: { color: Palette.textMuted, fontSize: 12 },
  profileBtn: { backgroundColor: Palette.cream, borderRadius: 18, padding: 4 },
  heroWrap: {
    marginHorizontal: 2,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.card,
    shadowColor: "#8A6A52",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 4,
  },
  heroImageWrap: { width: "100%", height: 200 },
  heroImage: { width: "100%", height: "100%" },
  heroLivePill: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(194,31,46,0.88)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroLiveDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: "#FFFFFF" },
  heroLiveText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },
  heroContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 5,
  },
  heroEyebrow: { color: Palette.crimson, fontSize: 12, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  heroTitle: { color: Palette.text, fontSize: 21, lineHeight: 27, fontWeight: "800", maxWidth: 320 },
  heroSubtitle: { color: Palette.textMuted, fontSize: 12.5, lineHeight: 18, maxWidth: 320 },
  heroInfoRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 4 },
  heroInfoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Palette.borderStrong,
    backgroundColor: Palette.cardSoft,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  heroInfoText: { color: Palette.text, fontSize: 11, fontWeight: "600" },
  heroDotsRow: {
    position: "absolute",
    right: 10,
    bottom: 10,
    flexDirection: "row",
    gap: 6,
    backgroundColor: "rgba(255,247,237,0.88)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D8C3A5" },
  heroDotActive: { width: 18, backgroundColor: Palette.orange },
  timingStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: Palette.cream,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 8,
  },
  timingText: { color: Palette.text, fontSize: 11.5, fontWeight: "700" },
  offersStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "rgba(194,31,46,0.08)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(194,31,46,0.28)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 4,
  },
  offersText: { color: Palette.crimson, fontSize: 11.5, fontWeight: "700" },
  newLaunchCard: {
    backgroundColor: Palette.crimson,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    padding: 14,
    marginTop: 8,
    marginBottom: 4,
    shadowColor: "#9E1826",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 3,
  },
  newLaunchBadge: {
    position: "absolute",
    top: -9,
    right: 14,
    backgroundColor: Palette.orange,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    transform: [{ rotate: "3deg" }],
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  newLaunchBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  newLaunchRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 },
  newLaunchImageWrap: { position: "relative" },
  newLaunchImage: { width: 110, height: 110, borderRadius: 14, borderWidth: 2, borderColor: "rgba(255,255,255,0.55)" },
  newLaunchPricePill: {
    position: "absolute",
    left: 6,
    bottom: 6,
    backgroundColor: "rgba(255,247,237,0.95)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  newLaunchPriceText: { color: Palette.crimson, fontSize: 11, fontWeight: "800" },
  newLaunchBody: { flex: 1, gap: 5, minWidth: 0 },
  newLaunchTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", lineHeight: 21 },
  newLaunchSubtitle: { color: "rgba(255,241,220,0.92)", fontSize: 11.5, lineHeight: 16 },
  orderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
  orderBtnText: { color: Palette.crimson, fontWeight: "800", fontSize: 12.5 },
  disabledBtn: { opacity: 0.55 },
  bestSellersWrap: { marginTop: 14, gap: 10 },
  bestSellersBanner: { backgroundColor: Palette.crimson, borderRadius: 14, padding: 13, gap: 2 },
  bestSellersEyebrow: { color: "rgba(255,241,220,0.9)", fontSize: 10, fontWeight: "800", letterSpacing: 2 },
  bestSellersTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", lineHeight: 21 },
  bestSellersSubtitle: { color: "rgba(255,241,220,0.9)", fontSize: 11.5 },
  sellerCardGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10, paddingHorizontal: 2 },
  sellerImageCard: { width: "48.6%", backgroundColor: Palette.card, borderRadius: 14, borderWidth: 1, borderColor: Palette.border, padding: 8, gap: 6 },
  sellerImageWrap: { position: "relative", aspectRatio: 1, borderRadius: 10, overflow: "hidden", backgroundColor: Palette.cardSoft },
  sellerImage: { width: "100%", height: "100%" },
  sellerImageBadge: { position: "absolute", top: 6, left: 6, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  sellerImageBadgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  sellerImageBody: { gap: 2 },
  sellerImageName: { color: Palette.text, fontSize: 13, fontWeight: "700" },
  sellerImagePrice: { color: Palette.orange, fontWeight: "800", fontSize: 13 },
  sellerImageOrderBtn: { backgroundColor: Palette.crimson, borderRadius: 9, alignItems: "center", paddingVertical: 7, marginTop: 2 },
  sellerImageOrderText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  categoriesSection: { paddingTop: 2, paddingBottom: 4 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 10 },
  sectionDividerLine: { flex: 1, height: 1, backgroundColor: Palette.border },
  sectionTitle: { color: Palette.text, fontSize: 13, fontWeight: "800", letterSpacing: 1.6, textTransform: "uppercase", textAlign: "center" },
  categoriesGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10, paddingHorizontal: 2 },
  categoryCard: { width: "31.6%", borderRadius: 14, alignItems: "center", paddingVertical: 12, paddingHorizontal: 8, borderWidth: 1, borderColor: Palette.border },
  categoryCardActive: { backgroundColor: Palette.crimson, borderColor: Palette.crimson, shadowColor: "#C21F2E", shadowOpacity: 0.28, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 4 },
  categoryCardEmblem: { width: 66, height: 66, borderRadius: 33, overflow: "hidden", marginBottom: 8, borderWidth: 2, borderColor: Palette.cream },
  categoryCardEmblemActive: { borderColor: "#FFFFFF" },
  categoryCardImage: { width: "100%", height: "100%", resizeMode: "cover" },
  categoryCardTitle: { color: Palette.text, fontSize: 10.5, fontWeight: "800", textAlign: "center", textTransform: "uppercase", letterSpacing: 0.4, minHeight: 28, lineHeight: 14 },
  categoryCardTitleActive: { color: "#FFFFFF" },
  orderingClosedBanner: { position: "absolute", backgroundColor: "rgba(194,31,46,0.92)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, zIndex: 2 },
  orderingClosedText: { color: "#FFFFFF", textAlign: "center", fontWeight: "600", fontSize: 12 },
  adBannerWrap: { position: "absolute", alignItems: "center" },
  checkoutPill: { position: "absolute", bottom: 16, right: 16, left: 16, backgroundColor: Palette.crimson, borderRadius: 999, paddingVertical: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, shadowColor: "#9E1826", shadowOpacity: 0.18, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 2 },
  checkoutPillText: { color: "#FFFFFF", fontWeight: "800" },
  modalBackdrop: { flex: 1, justifyContent: "flex-start", backgroundColor: "rgba(62,31,18,0.42)" },
  modalCard: { backgroundColor: Palette.card, borderRadius: 20, padding: 14, gap: 10, borderWidth: 1, borderColor: Palette.border, shadowColor: "#3E1F12", shadowOpacity: 0.2, shadowOffset: { width: 0, height: 6 }, shadowRadius: 18, elevation: 8, maxHeight: "88%" },
  profileCard: { backgroundColor: Palette.card, borderRadius: 20, padding: 14, gap: 10, borderWidth: 1, borderColor: Palette.border, shadowColor: "#3E1F12", shadowOpacity: 0.2, shadowOffset: { width: 0, height: 6 }, shadowRadius: 18, elevation: 8, maxWidth: 460, alignSelf: "center", width: "100%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  modalTitle: { color: Palette.text, fontSize: 20, fontWeight: "700" },
  modalSubtitle: { color: Palette.textMuted, fontSize: 12, marginTop: 3 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: Palette.cardSoft, borderWidth: 1, borderColor: Palette.border },
  cartRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: Palette.cardSoft, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: Palette.border },
  cartItemName: { color: Palette.text, fontWeight: "600" },
  cartVariant: { color: Palette.textMuted, fontSize: 12, marginTop: 2 },
  qtyWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: { backgroundColor: Palette.cream, borderRadius: 8, width: 26, height: 26, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: Palette.borderStrong },
  qtyLabel: { color: Palette.text, fontWeight: "700" },
  qtyValue: { color: Palette.text },
  billBox: { backgroundColor: Palette.cardSoft, borderRadius: 12, padding: 10, gap: 3, borderWidth: 1, borderColor: Palette.border },
  billText: { color: Palette.textMuted },
  billDiscount: { color: Palette.crimson, fontWeight: "700" },
  billEta: { color: Palette.orange, fontWeight: "600" },
  billTotal: { color: Palette.text, fontWeight: "800" },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Palette.cardSoft, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Palette.border },
  profileRowTitle: { color: Palette.text, fontWeight: "700" },
  profileRowSubtitle: { color: Palette.textMuted, fontSize: 12, marginTop: 2 },
  logoutRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, padding: 12 },
  logoutText: { color: Palette.crimson, fontWeight: "700" },
  placeBtn: { backgroundColor: Palette.crimson, borderRadius: 10, paddingVertical: 12, marginTop: 4 },
  placeBtnDisabled: { opacity: 0.6 },
  placeBtnText: { color: "#FFFFFF", textAlign: "center", fontWeight: "800" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 100 },
  spinnerWrap: { marginBottom: 16 },
  spinner: { ...(Platform.OS !== "web" && { textShadowColor: "rgba(0,0,0,0.2)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }) },
  loaderText: { color: Palette.orange, fontSize: 16, fontWeight: "600" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 54, gap: 8 },
  emptyStateTitle: { color: Palette.text, fontSize: 16, fontWeight: "700" },
  emptyStateText: { color: Palette.textMuted, fontSize: 13, textAlign: "center" },
  inlineAdWrap: { marginTop: 14, minHeight: 54, justifyContent: "center", alignItems: "center" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 100, paddingHorizontal: 24 },
  errorTitle: { color: Palette.crimson, fontSize: 20, fontWeight: "700", marginTop: 12 },
  errorMessage: { color: Palette.textMuted, fontSize: 14, marginTop: 8, textAlign: "center", lineHeight: 20 },
  retryBtn: { backgroundColor: Palette.crimson, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10, marginTop: 16 },
  retryBtnText: { color: "#FFFFFF", fontWeight: "700", textAlign: "center" },
});