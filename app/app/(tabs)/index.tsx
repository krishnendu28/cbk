import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AppState,
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
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { API_BASE_URL } from "@/utils/api";
import { useSession } from "@/context/session-context";
import { useCart } from "@/context/cart-context";
import { Palette } from "@/constants/theme";
import { AdBanner } from "@/components/admob/ad-banner";
import { useInterstitialAd } from "@/hooks/use-interstitial-ad";
import { MenuItemCard, MenuItemDetailSheet } from "@/components/menu-item-card";
import { FALLBACK_IMAGE, ResilientImage } from "@/components/resilient-image";
import { getMenuImageByFileName, getMenuItemImage } from "@/utils/get-menu-item-image";
import type { MenuCategory, MenuItem } from "@/types/menu";
import { isNonVegItem, isVegItem, type VegFilter } from "@/utils/veg";

type HeroSlide = {
  image: ReturnType<typeof getMenuImageByFileName>;
  title: string;
  subtitle: string;
  categoryId?: string;
  route?: "/monthly" | "/favourites" | "/explore";
};

const heroSlides: HeroSlide[] = [
  {
    image: getMenuImageByFileName("Handi Mutton.jpg"),
    title: "Handi Mutton · Champaran Style",
    subtitle: "Slow-cooked champaran-style mutton in a copper handi, sealed and steamed for rich, rustic flavour.",
    categoryId: "ahuna-champaran",
  },
  {
    image: getMenuImageByFileName("Handi-Chicken.png"),
    title: "Handi Chicken · Champaran Style",
    subtitle: "Tender chicken simmered dum-style in the handi with bold bihari spices, served piping hot.",
    categoryId: "ahuna-champaran",
  },
  {
    image: getMenuImageByFileName("Chicken butter masala combo.jpg"),
    title: "Curated Indian Flavors",
    subtitle: "Chef-crafted signatures with premium delivery finish.",
    categoryId: "combos",
  },
  {
    image: getMenuImageByFileName("Veg-Thali.jpg"),
    title: "Monthly Food Subscription",
    subtitle: "Fresh home-style thalis on a monthly plan — choose your menu & save big. Tap to explore.",
    route: "/monthly",
  },
];

const MAKHANA_ITEM_ID = 900001;
const SAVED_ADDRESSES_KEY = "cbk_saved_addresses";
type CategoryRow = { kind: "header"; label: string } | { kind: "item"; item: MenuItem };
const DRY_FRUIT_IMAGES = {
  makhana: "https://cbk-gamma.vercel.app/menu/makhana.jpg",
  kaju: "https://cbk-gamma.vercel.app/menu/kaju.jpg",
  almond: "https://cbk-gamma.vercel.app/menu/almond.jpg",
  kismis: "https://cbk-gamma.vercel.app/menu/kismis.jpg",
} as const;

const SPECIALS_CATEGORY: MenuCategory = {
  id: "dry-fruits",
  title: "Dry Fruits",
  items: [
    {
      id: MAKHANA_ITEM_ID,
      name: "Makhana Roasted 250gm",
      prices: { Standard: 250, Premium: 350 },
      image: DRY_FRUIT_IMAGES.makhana,
    },
    {
      id: MAKHANA_ITEM_ID + 1,
      name: "Kaju 1kg",
      prices: { "Medium Size": 1100, "Bigger Size": 1400 },
      image: DRY_FRUIT_IMAGES.kaju,
    },
    {
      id: MAKHANA_ITEM_ID + 2,
      name: "Almond 1kg",
      prices: { Standard: 1100, Premium: 1300 },
      image: DRY_FRUIT_IMAGES.almond,
    },
    {
      id: MAKHANA_ITEM_ID + 3,
      name: "Kismis 1kg",
      prices: { Standard: 520, Premium: 700 },
      image: DRY_FRUIT_IMAGES.kismis,
    },
  ],
};

type NewLaunchProduct = {
  id: number;
  name: string;
  imageUrl: string;
  priceLabel: string;
  priceFrom: number;
  description: string;
};

const NEW_LAUNCH_PRODUCTS: NewLaunchProduct[] = [
  {
    id: MAKHANA_ITEM_ID,
    name: "Makhana Roasted 250gm",
    imageUrl: DRY_FRUIT_IMAGES.makhana,
    priceLabel: "Premium ₹350 · Standard ₹250",
    priceFrom: 250,
    description: "Premium roasted fox nuts (makhana), lightly spiced & packed fresh.",
  },
  {
    id: MAKHANA_ITEM_ID + 1,
    name: "Kaju 1kg",
    imageUrl: DRY_FRUIT_IMAGES.kaju,
    priceLabel: "Medium ₹1100 · Bigger ₹1400",
    priceFrom: 1100,
    description: "Whole cashew nuts — rich, buttery and crunch-fresh.",
  },
  {
    id: MAKHANA_ITEM_ID + 2,
    name: "Almond 1kg",
    imageUrl: DRY_FRUIT_IMAGES.almond,
    priceLabel: "Standard ₹1100 · Premium ₹1300",
    priceFrom: 1100,
    description: "Premium whole almonds (badam), naturally delicious & healthy.",
  },
  {
    id: MAKHANA_ITEM_ID + 3,
    name: "Kismis 1kg",
    imageUrl: DRY_FRUIT_IMAGES.kismis,
    priceLabel: "Standard ₹520 · Premium ₹700",
    priceFrom: 520,
    description: "Sweet golden raisins (kismis), soft, juicy & sun-dried.",
  },
];
const NEW_LAUNCH_ITEMS: MenuItem[] = SPECIALS_CATEGORY.items;

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
      { label: "Paneer Masala", itemName: "Paneer Butter Masala (8 pcs)" },
      { label: "Mushroom Masala", itemName: "Mushroom Masala" },
      { label: "Paneer Pakoda", itemName: "Paneer Pakoda (8 pcs)" },
    ],
  },
  {
    id: "nonveg",
    title: "Non-Veg Bestsellers",
    badge: "NON-VEG",
    badgeColor: Palette.crimson,
    items: [
      { label: "Handi Mutton", itemName: "Handi Mutton (15-16 pcs)" },
      { label: "Handi Chicken", itemName: "Handi Chicken (15-16 pcs)" },
      { label: "Chicken 65", itemName: "Chicken 65(8) (8 pcs)" },
      { label: "Chicken Lollipop", itemName: "Chicken Lollipop (Drums of Heaven 8 pcs)" },
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
};

const RESTAURANT_PHONE_LABEL = "+91 8420252042";
const RESTAURANT_PHONE_DIAL = "+918420252042";

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizeDateOfBirth(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const dayFirst = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dayFirst) {
    const day = dayFirst[1].padStart(2, "0");
    const month = dayFirst[2].padStart(2, "0");
    return `${dayFirst[3]}-${month}-${day}`;
  }

  return undefined;
}

function dateToIso(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDobToDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (match) {
    const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date(2000, 0, 1);
}

const DEFAULT_DOB_DATE = new Date(2000, 0, 1);

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
    discountEnabled,
    discountRate,
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
  const [loginDob, setLoginDob] = useState("");
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
  const [bestSellerSheetItem, setBestSellerSheetItem] = useState<MenuItem | null>(null);
  const [bestSellersOpen, setBestSellersOpen] = useState(false);
  const [newLaunchSheetItem, setNewLaunchSheetItem] = useState<MenuItem | null>(null);
  const [sellerFilter, setSellerFilter] = useState<"All" | "Veg" | "NonVeg">("All");
  const [categoryFilter, setCategoryFilter] = useState<VegFilter>("All");
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [dobDate, setDobDate] = useState<Date>(DEFAULT_DOB_DATE);
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<{ room: string; landmark: string }[]>([]);

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
    const intervalId = setInterval(refreshMenu, 10000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [activeCategory, session, mergeSpecials]);

  useEffect(() => {
    AsyncStorage.getItem(SAVED_ADDRESSES_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedAddresses(parsed.filter((entry) => entry && typeof entry.room === "string" && entry.room.trim()));
        }
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" || !session) return;
      axios
        .get(`${API_BASE_URL}/api/menu`)
        .then((response) => {
          if (Array.isArray(response.data)) setMenuCategories(mergeSpecials(response.data));
        })
        .catch(() => null);
    });
    return () => subscription.remove();
  }, [session, mergeSpecials]);

  const persistAddress = (roomText: string, landmarkText: string) => {
    const cleaned = { room: roomText.trim(), landmark: landmarkText.trim() };
    if (!cleaned.room) return;
    setSavedAddresses((prev) => {
      const next = [cleaned, ...prev.filter((addr) => addr.room.toLowerCase() !== cleaned.room.toLowerCase())].slice(0, 6);
      AsyncStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(next)).catch(() => null);
      return next;
    });
  };

  useEffect(() => {
    if (session?.phone) {
      setCheckoutPhone((prev) => (prev ? prev : session.phone));
    }
  }, [session?.phone]);

  const activeCategoryData = useMemo(
    () => menuCategories.find((category) => category.id === activeCategory) ?? menuCategories[0],
    [activeCategory, menuCategories],
  );

  const activeCategoryRows = useMemo<CategoryRow[]>(() => {
    const items = activeCategoryData?.items?.filter((entry) => entry.available !== false) || [];
    if (!items.length) return [];

    const veg = items.filter((entry) => isVegItem(entry.name));
    const nonVeg = items.filter((entry) => isNonVegItem(entry.name));

    if (categoryFilter === "Veg") return veg.map((item) => ({ kind: "item" as const, item }));
    if (categoryFilter === "NonVeg") return nonVeg.map((item) => ({ kind: "item" as const, item }));

    if (activeCategoryData?.id !== "combos") return items.map((item) => ({ kind: "item" as const, item }));

    const rows: CategoryRow[] = [];
    if (veg.length) rows.push({ kind: "header", label: `Vegetarian Combos (${veg.length})` });
    veg.forEach((item) => rows.push({ kind: "item", item }));
    if (nonVeg.length) rows.push({ kind: "header", label: `Non-Vegetarian Combos (${nonVeg.length})` });
    nonVeg.forEach((item) => rows.push({ kind: "item", item }));
    return rows;
  }, [activeCategoryData, categoryFilter]);

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

  const visibleSellerItems = useMemo(() => {
    return SELLER_GROUPS.flatMap((group) => {
      if (sellerFilter !== "All" && group.badge !== (sellerFilter === "Veg" ? "VEG" : "NON-VEG")) return [];
      return group.items.map((seller) => ({ seller, group }));
    });
  }, [sellerFilter]);

  const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.totalPrice, 0), [cartItems]);
  const deliveryChargeForCart = cartItems.length ? deliveryCharge : 0;
  const promoApplied = validatePromoCode(promoInput);
  const promoDiscount = promoApplied ? Number(((subtotal * promoRate) / 100).toFixed(2)) : 0;
  const firstOrderDiscount =
    firstOrderDiscountEnabled && isFirstOrder ? Number(((subtotal * firstOrderDiscountRate) / 100).toFixed(2)) : 0;
  const generalDiscount =
    !promoDiscount && !firstOrderDiscount && discountEnabled && discountRate > 0
      ? Number(((subtotal * discountRate) / 100).toFixed(2))
      : 0;
  const totalDiscount = promoDiscount || firstOrderDiscount || generalDiscount;
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
        <Pressable
          onPress={() => {
            const slide = heroSlides[heroIndex];
            if (slide.categoryId) {
              setActiveCategory(slide.categoryId);
              router.push(`/category/${slide.categoryId}`);
            } else if (slide.route) {
              router.push(slide.route);
            }
          }}
          style={({ pressed }) => [styles.heroImageWrap, pressed && { opacity: 0.92 }]}>
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
        </Pressable>
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

          {promoActive && promoRate > 0 ? (
            <View style={styles.offersStrip}>
              <Ionicons name="pricetag-outline" size={14} color={Palette.crimson} />
              <Text style={styles.offersText}>
                {promoCode ? `Use code ${promoCode} · ` : ""}{promoRate}% off your order right now.
              </Text>
            </View>
          ) : firstOrderDiscountEnabled && isFirstOrder ? (
            <View style={styles.offersStrip}>
              <Ionicons name="gift-outline" size={14} color={Palette.crimson} />
              <Text style={styles.offersText}>First order! Get {firstOrderDiscountRate}% off on your first meal.</Text>
            </View>
          ) : discountEnabled && discountRate > 0 ? (
            <View style={styles.offersStrip}>
              <Ionicons name="pricetag-outline" size={14} color={Palette.crimson} />
              <Text style={styles.offersText}>Get {discountRate}% off on your order now.</Text>
            </View>
          ) : null}

          <View style={styles.newLaunchSection}>
            <View style={styles.newLaunchHeaderRow}>
              <View style={styles.newLaunchBadge}>
                <Text style={styles.newLaunchBadgeText}>NEW LAUNCH</Text>
              </View>
              <Text style={styles.newLaunchSectionTitle}>Try Our New Dry Fruits</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: horizontalSafePadding, gap: 12, paddingBottom: 4 }}
              decelerationRate="fast">
              {NEW_LAUNCH_PRODUCTS.map((product) => {
                const item = NEW_LAUNCH_ITEMS.find((entry) => entry.id === product.id);
                const isComingSoon = product.id !== MAKHANA_ITEM_ID;
                return (
                  <View key={product.id} style={[styles.nlCard, { width: 220 }]}>
                    <View style={styles.nlImageWrap}>
                      <ResilientImage primarySource={getMenuItemImage(product.name, "Dry-Fruits", product.imageUrl)} secondarySource={FALLBACK_IMAGE} style={styles.nlImage} />
                      <View style={styles.nlPricePill}>
                        <Text style={styles.nlPriceText}>from Rs {product.priceFrom}</Text>
                      </View>
                      {isComingSoon ? (
                        <View style={styles.nlComingSoonPill}>
                          <Text style={styles.nlComingSoonText}>Coming Soon</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.nlBody}>
                      <Text style={styles.nlTitle}>{product.name}</Text>
                      <Text style={styles.nlPriceLabel}>{product.priceLabel}</Text>
                      <Text style={styles.nlDesc} numberOfLines={2}>{product.description}</Text>
                      {isComingSoon ? (
                        <View style={styles.orderBtnComingSoon}>
                          <Ionicons name="hourglass-outline" size={14} color={Palette.textMuted} />
                          <Text style={styles.orderBtnComingSoonText}>Coming Soon</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.orderBtn, !isOrderingOpen && styles.disabledBtn]}
                          onPress={() => {
                            if (!item) return;
                            const liveItem = findMenuItemByName(product.name) || item;
                            setNewLaunchSheetItem(liveItem);
                          }}
                          activeOpacity={0.88}
                          disabled={!isOrderingOpen || !item}>
                          <Ionicons name="cart" size={14} color={Palette.crimson} />
                          <Text style={styles.orderBtnText}>Select Size · Order</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
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
            <TouchableOpacity
              style={styles.bestSellersBanner}
              activeOpacity={0.85}
              onPress={() => setBestSellersOpen(true)}>
              <View style={styles.bestSellersBannerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bestSellersEyebrow}>HOT LIST</Text>
                  <Text style={styles.bestSellersTitle}>Best Seller Items of the Restaurant</Text>
                </View>
                <View style={styles.bestSellersBannerCta}>
                  <Text style={styles.bestSellersCtaText}>View all</Text>
                  <Ionicons name="chevron-forward" size={15} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.bestSellersSubtitle}>Tap to open the full best-sellers list.</Text>
            </TouchableOpacity>
            <View style={styles.sellerFilterRow}>
              {(["All", "Veg", "NonVeg"] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.sellerFilterChip, sellerFilter === option && styles.sellerFilterChipActive]}
                  onPress={() => setSellerFilter(option)}
                  activeOpacity={0.85}>
                  <Text style={[styles.sellerFilterChipText, sellerFilter === option && styles.sellerFilterChipTextActive]}>
                    {option === "Veg" ? "🌿 Veg" : option === "NonVeg" ? "🍗 Non-Veg" : "All Items"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.sellerCardGrid}>
              {visibleSellerItems.length === 0 ? (
                <Text style={styles.sellerFilterEmpty}>No best sellers in this filter right now.</Text>
              ) : (
                visibleSellerItems.map(({ seller, group }) => {
                  const menuItem = findMenuItemByName(seller.itemName);
                  const price = menuItem ? Number(Object.values(menuItem.prices || {})[0] || 0) : 0;
                  const image = getMenuItemImage(seller.itemName, "Main Course", menuItem?.image);
                  const isVeg = group.badge === "VEG";
                  return (
                    <TouchableOpacity
                      key={seller.itemName}
                      style={styles.sellerImageCard}
                      activeOpacity={0.9}
                      onPress={() => menuItem && setBestSellerSheetItem(menuItem)}>
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
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
            {bestSellerSheetItem ? (
              <MenuItemDetailSheet
                item={bestSellerSheetItem}
                categoryTitle="Best Sellers"
                openCartOnAdd
                visible
                onClose={() => setBestSellerSheetItem(null)}
              />
            ) : null}
            {newLaunchSheetItem ? (
              <MenuItemDetailSheet
                item={newLaunchSheetItem}
                categoryTitle="Newly Launched"
                openCartOnAdd
                visible
                onClose={() => setNewLaunchSheetItem(null)}
              />
            ) : null}
          </View>

          <View style={styles.categoryFilterWrap}>
            <View style={styles.categoryFilterHead}>
              <Text style={styles.categoryFilterTitle}>{(activeCategoryData?.title || "Menu").toUpperCase()}</Text>
              <Text style={styles.categoryFilterCount}>
                {activeCategoryRows.filter((row) => row.kind === "item").length} items
              </Text>
            </View>
            <View style={styles.sellerFilterRow}>
              {(["All", "Veg", "NonVeg"] as const).map((option) => (
                <TouchableOpacity
                  key={`cat-filter-${option}`}
                  style={[styles.sellerFilterChip, categoryFilter === option && styles.sellerFilterChipActive]}
                  onPress={() => setCategoryFilter(option)}
                  activeOpacity={0.85}>
                  <Text style={[styles.sellerFilterChipText, categoryFilter === option && styles.sellerFilterChipTextActive]}>
                    {option === "Veg" ? "🌿 Veg" : option === "NonVeg" ? "🍗 Non-Veg" : "All"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const handleLogin = () => {
    const cleanedPhone = digitsOnly(loginPhone);
    if (!cleanedPhone) {
      Alert.alert("Phone required", "Please enter your phone number to continue.");
      return;
    }
    if (cleanedPhone.length !== 10) {
      Alert.alert("Invalid phone number", "Please enter a valid 10-digit mobile number.");
      return;
    }
    login({ name: loginName, phone: cleanedPhone, dateOfBirth: normalizeDateOfBirth(loginDob) });
  };

  const openDobPicker = () => {
    setDobDate(parseDobToDate(loginDob));
    setShowDobPicker(true);
  };

  const handleDobChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDobPicker(false);
      if (event.type !== "set" || !selectedDate) return;
    }
    const next = selectedDate || dobDate;
    setDobDate(next);
    setLoginDob(dateToIso(next));
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

    const cleanedCheckoutPhone = digitsOnly(checkoutPhone);
    if (cleanedCheckoutPhone.length !== 10) {
      Alert.alert("Phone required", "Please enter a valid 10-digit contact phone number to place the order.");
      return;
    }

    if (!cartItems.length) {
      Alert.alert("Cart empty", "Add items before checkout.");
      return;
    }

    setPlacingOrder(true);
    try {
      const trimmedName = (session.name || "").trim();
      const customerName = trimmedName.length >= 2 ? trimmedName : session.guest ? "Guest" : "Customer";
      const safeEta = Math.min(180, Math.max(15, Math.round(Number(etaMinutes) || 30)));
      await axios.post(`${API_BASE_URL}/api/orders`, {
        customerName,
        phone: cleanedCheckoutPhone,
        dateOfBirth: normalizeDateOfBirth(session.dateOfBirth || ""),
        address: `Flat/Room: ${flatRoom}${landmark.trim() ? `, Landmark: ${landmark}` : ""}`,
        instructions: instructions.trim(),
        items: cartItems,
        subtotal,
        promoCode: promoInput.trim() || undefined,
        deliveryEtaMinutes: safeEta,
        total: grandTotal,
      });

      if (isFirstOrder) {
        markFirstOrderUsed();
      }
      persistAddress(flatRoom, landmark);
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
        const issues = error?.response?.data?.issues;
        const issueText = Array.isArray(issues)
          ? issues.map((issue: any) => issue?.message).filter(Boolean).join("\n")
          : "";
        Alert.alert(
          "Order failed",
          issueText || error?.response?.data?.message || "Please try again.",
        );
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
      <ImageBackground source={getMenuImageByFileName("Chicken butter masala combo.jpg")} style={[styles.loginContainer, { paddingTop: insets.top + 10, paddingHorizontal: horizontalSafePadding }]}>
        <View style={styles.loginOverlay} />
        <View style={styles.loginCard}>
          <Image source={require("@/assets/images/logo.jpeg")} style={styles.logo} />
          <Text style={styles.loginTitle}>Chakhna By Kilo</Text>
          <Text style={styles.loginSubtitle}>Premium food ordering in your pocket.</Text>
          <TextInput value={loginName} onChangeText={setLoginName} placeholder="Name (optional)" placeholderTextColor={Palette.textMuted} style={styles.input} />
          <TextInput
            value={loginPhone}
            onChangeText={(value) => setLoginPhone(digitsOnly(value).slice(0, 10))}
            placeholder="Phone number *"
            placeholderTextColor={Palette.textMuted}
            style={styles.input}
            keyboardType="phone-pad"
            maxLength={10}
          />
          <TouchableOpacity style={styles.dobField} onPress={openDobPicker} activeOpacity={0.85}>
            <Ionicons name="calendar-outline" size={16} color={Palette.crimson} />
            <Text style={[styles.dobFieldText, !loginDob && styles.dobFieldPlaceholder]}>
              {loginDob ? loginDob : "Date of birth (optional) — tap to pick"}
            </Text>
          </TouchableOpacity>
          {showDobPicker && Platform.OS === "android" ? (
            <DateTimePicker
              value={dobDate}
              mode="date"
              display="calendar"
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
              onChange={handleDobChange}
            />
          ) : null}
          {showDobPicker && Platform.OS !== "android" ? (
            <Modal transparent animationType="fade" visible onRequestClose={() => setShowDobPicker(false)}>
              <View style={styles.dobModalBackdrop}>
                <View style={styles.dobModalCard}>
                  <Text style={styles.dobModalTitle}>Select your date of birth</Text>
                  <DateTimePicker
                    value={dobDate}
                    mode="date"
                    display="spinner"
                    maximumDate={new Date()}
                    minimumDate={new Date(1900, 0, 1)}
                    onChange={handleDobChange}
                  />
                  <TouchableOpacity style={styles.dobModalDone} onPress={() => setShowDobPicker(false)} activeOpacity={0.85}>
                    <Text style={styles.dobModalDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          ) : null}
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
        data={!loadingMenu && !menuError ? activeCategoryRows : []}
        keyExtractor={(item, index) => (item.kind === "header" ? `header-${item.label}-${index}` : `${activeCategoryData?.id}-${item.item?.id}`)}
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
        renderItem={({ item }) =>
          item.kind === "header" ? (
            <View style={styles.comboGroupHeader}>
              <Text style={styles.comboGroupHeaderText}>{item.label}</Text>
            </View>
          ) : (
            <MenuItemCard item={item.item as MenuItem} categoryTitle={activeCategoryData?.title || ""} />
          )
        }
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
            bottom: cartItems.length > 0 ? Math.max(16, insets.bottom + 10) + 62 : Math.max(14, insets.bottom + 6),
          },
        ]}
      >
        <AdBanner />
      </View>

      {cartItems.length > 0 && (
        <TouchableOpacity
          activeOpacity={0.88}
          style={[styles.checkoutPill, { left: horizontalSafePadding, right: horizontalSafePadding, bottom: Math.max(16, insets.bottom + 10) }]}
          onPress={() => {
            setCartVisible(true);
            showCheckoutInterstitial();
          }}
        >
          <Ionicons name="cart" size={16} color="#FFFFFF" />
          <Text style={styles.checkoutPillText}>View Cart ({cartItems.length})</Text>
          <View style={styles.checkoutPillBadge}>
            <Text style={styles.checkoutPillBadgeText}>Rs {grandTotal}</Text>
          </View>
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
                      : discountEnabled && discountRate > 0
                        ? `${discountRate}% OFF on all orders`
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

      <Modal visible={bestSellersOpen} animationType="slide" transparent onRequestClose={() => setBestSellersOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { marginTop: insets.top + 12, paddingLeft: horizontalSafePadding, paddingRight: horizontalSafePadding }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Best Sellers</Text>
                <Text style={styles.modalSubtitle}>Favourite dishes of our guests.</Text>
              </View>
              <TouchableOpacity activeOpacity={0.82} onPress={() => setBestSellersOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={Palette.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
              {SELLER_GROUPS.map((group) => (
                <View key={group.id} style={{ marginBottom: 14 }}>
                  <Text style={styles.sellerGroupHeading}>{group.title}</Text>
                  <View style={styles.sellerCardGrid}>
                    {group.items.map((seller) => {
                      const menuItem = findMenuItemByName(seller.itemName);
                      const price = menuItem ? Number(Object.values(menuItem.prices || {})[0] || 0) : 0;
                      const image = getMenuItemImage(seller.itemName, "Main Course", menuItem?.image);
                      const isVeg = group.badge === "VEG";
                      return (
                        <View key={seller.itemName} style={styles.sellerImageCard}>
                          <TouchableOpacity
                            style={styles.sellerImageWrap}
                            activeOpacity={0.9}
                            onPress={() => {
                              setBestSellersOpen(false);
                              if (menuItem) setBestSellerSheetItem(menuItem);
                            }}>
                            <ResilientImage primarySource={image} secondarySource={FALLBACK_IMAGE} style={styles.sellerImage} />
                            <View style={[styles.sellerImageBadge, { backgroundColor: isVeg ? Palette.orange : Palette.crimson }]}>
                              <Text style={styles.sellerImageBadgeText}>{group.badge}</Text>
                            </View>
                          </TouchableOpacity>
                          <View style={styles.sellerImageBody}>
                            <Text style={styles.sellerImageName} numberOfLines={1}>{seller.label}</Text>
                            <Text style={styles.sellerImagePrice}>Rs {price}</Text>
                            <TouchableOpacity
                              style={[styles.sellerImageOrderBtn, (!isOrderingOpen || !menuItem) && styles.disabledBtn]}
                              onPress={() => {
                                if (menuItem) {
                                  setBestSellersOpen(false);
                                  addToCart(menuItem);
                                }
                              }}
                              activeOpacity={0.85}
                              disabled={!isOrderingOpen || !menuItem}>
                              <Text style={styles.sellerImageOrderText}>Order</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
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

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
              <View style={styles.cartSummaryRow}>
                <Text style={styles.cartSummaryText}>{cartItems.length} item{cartItems.length === 1 ? "" : "s"} in cart</Text>
                <TouchableOpacity onPress={() => setCartItems([])} activeOpacity={0.8}>
                  <Text style={styles.cartClearText}>Clear all</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cartGrid}>
                {cartItems.map((item) => (
                  <View key={item.id} style={styles.cartTile}>
                    <Text style={styles.cartTileName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.cartTileVariant} numberOfLines={1}>{item.variant}</Text>
                    <View style={styles.cartTileBottom}>
                      <View style={styles.qtyWrap}>
                        <Pressable onPress={() => updateQuantity(item.id, -1)} style={styles.qtyBtn}><Text style={styles.qtyLabel}>-</Text></Pressable>
                        <Text style={styles.qtyValue}>{item.quantity}</Text>
                        <Pressable onPress={() => updateQuantity(item.id, 1)} style={styles.qtyBtn}><Text style={styles.qtyLabel}>+</Text></Pressable>
                      </View>
                      <Text style={styles.cartTilePrice}>Rs {item.totalPrice}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {savedAddresses.length > 0 ? (
                <View style={styles.savedAddrWrap}>
                  <Text style={styles.savedAddrLabel}>Saved addresses — tap to use</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }}>
                    {savedAddresses.map((addr, idx) => (
                      <TouchableOpacity
                        key={`${addr.room}-${idx}`}
                        style={styles.savedAddrChip}
                        onPress={() => setFlatRoom(addr.room)}
                        activeOpacity={0.8}>
                        <Ionicons name="location-outline" size={12} color={Palette.crimson} />
                        <Text style={styles.savedAddrChipText} numberOfLines={1}>
                          {addr.room}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              <TextInput
                value={checkoutPhone}
                onChangeText={(value) => setCheckoutPhone(digitsOnly(value).slice(0, 10))}
                placeholder="Contact phone number *"
                placeholderTextColor={Palette.textMuted}
                style={styles.input}
                keyboardType="phone-pad"
                maxLength={10}
              />
              <TextInput value={flatRoom} onChangeText={setFlatRoom} placeholder="Flat / House no and Room" placeholderTextColor={Palette.textMuted} style={styles.input} />
              <TextInput value={instructions} onChangeText={setInstructions} placeholder="Instructions (e.g. less spicy, no onions)" placeholderTextColor={Palette.textMuted} style={styles.input} />
              <TextInput value={promoInput} onChangeText={setPromoInput} placeholder={promoActive && promoCode ? `Promo code (hint: ${promoCode})` : "Promo code (optional)"} placeholderTextColor={Palette.textMuted} style={styles.input} autoCapitalize="characters" />

              <View style={styles.billBox}>
                <Text style={styles.billText}>Subtotal: Rs {subtotal}</Text>
                {promoDiscount > 0 ? (
                  <Text style={styles.billDiscount}>Promo Applied ({promoRate}%): -Rs {promoDiscount}</Text>
                ) : null}
                {promoDiscount <= 0 && firstOrderDiscount > 0 ? (
                  <Text style={styles.billDiscount}>First Order Discount ({firstOrderDiscountRate}%): -Rs {firstOrderDiscount}</Text>
                ) : null}
                {promoDiscount <= 0 && firstOrderDiscount <= 0 && generalDiscount > 0 ? (
                  <Text style={styles.billDiscount}>Discount ({discountRate}%): -Rs {generalDiscount}</Text>
                ) : null}
                <Text style={styles.billText}>Delivery: Rs {deliveryChargeForCart}</Text>
                <Text style={styles.billEta}>Estimated delivery: about {etaMinutes} min</Text>
                <Text style={styles.billTotal}>Payable: Rs {grandTotal}</Text>
              </View>

              <TouchableOpacity style={[styles.placeBtn, !isOrderingOpen && styles.placeBtnDisabled]} disabled={placingOrder || !isOrderingOpen} onPress={placeOrder}>
                <Text style={styles.placeBtnText}>{placingOrder ? "Placing..." : isOrderingOpen ? `Place Order · Rs ${grandTotal}` : "Ordering Closed"}</Text>
              </TouchableOpacity>
            </ScrollView>
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
  loginOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,247,237,0.72)" },
  loginCard: { backgroundColor: Palette.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Palette.border },
  logo: { width: 78, height: 78, alignSelf: "center", borderRadius: 39, marginBottom: 8 },
  loginTitle: { color: Palette.text, fontSize: 24, fontWeight: "700", textAlign: "center" },
  loginSubtitle: { color: Palette.textMuted, textAlign: "center", marginBottom: 12 },
  input: { backgroundColor: Palette.surface, color: Palette.text, borderRadius: 10, borderWidth: 1, borderColor: Palette.borderStrong, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  dobField: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Palette.surface, borderRadius: 10, borderWidth: 1, borderColor: Palette.borderStrong, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 8 },
  dobFieldText: { color: Palette.text, fontSize: 14, flex: 1 },
  dobFieldPlaceholder: { color: Palette.textMuted },
  dobModalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 24 },
  dobModalCard: { width: "100%", backgroundColor: Palette.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Palette.border },
  dobModalTitle: { color: Palette.text, fontSize: 15, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  dobModalDone: { backgroundColor: Palette.crimson, borderRadius: 10, paddingVertical: 11, alignItems: "center", marginTop: 8 },
  dobModalDoneText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
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
  newLaunchSection: { marginTop: 10, marginBottom: 2 },
  newLaunchHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    marginHorizontal: 6,
    marginBottom: 10,
  },
  newLaunchSectionTitle: { color: Palette.text, fontSize: 15, fontWeight: "800" },
  nlCard: {
    backgroundColor: Palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  nlImageWrap: { position: "relative" },
  nlImage: { width: "100%", height: 140 },
nlPricePill: {
  position: "absolute",
  left: 8,
  bottom: 8,
  backgroundColor: "rgba(255,247,237,0.95)",
  borderRadius: 999,
  paddingHorizontal: 9,
  paddingVertical: 3,
},
nlComingSoonPill: {
  position: "absolute",
  right: 8,
  top: 8,
  backgroundColor: "rgba(62,31,18,0.82)",
  borderRadius: 999,
  paddingHorizontal: 9,
  paddingVertical: 3,
},
nlComingSoonText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
orderBtnComingSoon: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  backgroundColor: Palette.cardSoft,
  borderRadius: 10,
  paddingVertical: 8,
  paddingHorizontal: 14,
  alignSelf: "flex-start",
  borderWidth: 1,
  borderColor: Palette.border,
},
orderBtnComingSoonText: { color: Palette.textMuted, fontWeight: "800", fontSize: 12.5 },
savedAddrWrap: { gap: 6 },
savedAddrLabel: { color: Palette.textMuted, fontSize: 11.5, fontWeight: "700" },
savedAddrChip: {
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
  backgroundColor: Palette.surface,
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderWidth: 1,
  borderColor: Palette.borderStrong,
  maxWidth: 260,
},
savedAddrChipText: { color: Palette.text, fontSize: 11.5, fontWeight: "600" },
  nlPriceText: { color: Palette.crimson, fontSize: 11, fontWeight: "800" },
  nlBody: { padding: 10, gap: 4 },
  nlTitle: { color: Palette.text, fontSize: 13.5, fontWeight: "800" },
  nlPriceLabel: { color: Palette.crimson, fontSize: 11.5, fontWeight: "700" },
  nlDesc: { color: Palette.textMuted, fontSize: 11, lineHeight: 15 },
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
  bestSellersBanner: { backgroundColor: Palette.crimson, borderRadius: 14, padding: 13, gap: 4 },
  bestSellersBannerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  bestSellersBannerCta: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(255,241,220,0.18)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  bestSellersCtaText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  bestSellersEyebrow: { color: "rgba(255,241,220,0.9)", fontSize: 10, fontWeight: "800", letterSpacing: 2 },
  bestSellersTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", lineHeight: 21 },
  bestSellersSubtitle: { color: "rgba(255,241,220,0.9)", fontSize: 11.5 },
  sellerGroupHeading: { color: Palette.text, fontSize: 13, fontWeight: "800", marginBottom: 8 },
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
  sellerFilterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 2 },
  sellerFilterChip: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.borderStrong },
  sellerFilterChipActive: { backgroundColor: Palette.cream, borderColor: Palette.crimson },
  sellerFilterChipText: { color: Palette.textMuted, fontSize: 12, fontWeight: "700" },
  sellerFilterChipTextActive: { color: Palette.crimson },
  sellerFilterEmpty: { color: Palette.textMuted, fontSize: 12.5, textAlign: "center", paddingVertical: 16, width: "100%" },
  categoryFilterWrap: { marginTop: 18, marginBottom: 4, gap: 10 },
  categoryFilterHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2 },
  categoryFilterTitle: { color: Palette.text, fontWeight: "800", fontSize: 15, letterSpacing: 0.6 },
  categoryFilterCount: { color: Palette.textMuted, fontSize: 11.5, fontWeight: "600" },

  categoriesSection: { paddingTop: 2, paddingBottom: 4 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 10 },
  comboGroupHeader: { paddingVertical: 4 },
  comboGroupHeaderText: { color: Palette.crimson, fontWeight: "800", fontSize: 14, letterSpacing: 0.4 },
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
  checkoutPill: { position: "absolute", backgroundColor: Palette.green, borderRadius: 999, paddingVertical: 13, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 8, shadowColor: "#0E7A3C", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 5 },
  checkoutPillText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  checkoutPillBadge: { marginLeft: "auto", backgroundColor: "rgba(255,255,255,0.24)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  checkoutPillBadgeText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  modalBackdrop: { flex: 1, justifyContent: "flex-start", backgroundColor: "rgba(62,31,18,0.42)" },
  modalCard: { backgroundColor: Palette.card, borderRadius: 20, padding: 14, gap: 10, borderWidth: 1, borderColor: Palette.border, shadowColor: "#3E1F12", shadowOpacity: 0.2, shadowOffset: { width: 0, height: 6 }, shadowRadius: 18, elevation: 8, maxHeight: "88%" },
  profileCard: { backgroundColor: Palette.card, borderRadius: 20, padding: 14, gap: 10, borderWidth: 1, borderColor: Palette.border, shadowColor: "#3E1F12", shadowOpacity: 0.2, shadowOffset: { width: 0, height: 6 }, shadowRadius: 18, elevation: 8, maxWidth: 460, alignSelf: "center", width: "100%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  modalTitle: { color: Palette.text, fontSize: 20, fontWeight: "700" },
  modalSubtitle: { color: Palette.textMuted, fontSize: 12, marginTop: 3 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: Palette.cardSoft, borderWidth: 1, borderColor: Palette.border },
  cartSummaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2 },
  cartSummaryText: { color: Palette.textMuted, fontSize: 12, fontWeight: "700" },
  cartClearText: { color: Palette.crimson, fontSize: 12, fontWeight: "800" },
  cartGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cartTile: { width: "48.5%", backgroundColor: Palette.cardSoft, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: Palette.border, gap: 3 },
  cartTileName: { color: Palette.text, fontWeight: "700", fontSize: 13 },
  cartTileVariant: { color: Palette.textMuted, fontSize: 11 },
  cartTileBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  cartTilePrice: { color: Palette.text, fontWeight: "800", fontSize: 13 },
  qtyWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
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