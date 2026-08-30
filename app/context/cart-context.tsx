import axios from "axios";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useSession } from "@/context/session-context";
import type { CartItem, MenuItem } from "@/types/menu";
import { API_BASE_URL } from "@/utils/api";

const FAVORITES_KEY = "cbk_favorites";
const FIRST_ORDER_KEY = "cbk_ordered_before";
const DEFAULT_DELIVERY_CHARGE = 10;
const DEFAULT_ETA_MINUTES = 45;

type OrderWindow = {
  type?: string;
  label?: string;
  start?: string;
  end?: string;
  active?: boolean;
};

type CartContextType = {
  cartItems: CartItem[];
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  cartVisible: boolean;
  setCartVisible: (visible: boolean) => void;
  variantSelections: Record<string, string>;
  setVariantSelections: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isOrderingOpen: boolean;
  setIsOrderingOpen: (open: boolean) => void;
  addToCart: (item: MenuItem, openCart?: boolean) => void;
  updateQuantity: (id: string, delta: number) => void;
  favorites: string[];
  toggleFavorite: (itemName: string) => void;
  deliveryCharge: number;
  etaMinutes: number;
  orderWindows: OrderWindow[];
  firstOrderDiscountEnabled: boolean;
  firstOrderDiscountRate: number;
  isFirstOrder: boolean;
  markFirstOrderUsed: () => void;
  promoActive: boolean;
  promoCode: string;
  promoRate: number;
  promoExpiresAt: string;
  validatePromoCode: (code: string) => boolean;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartVisible, setCartVisible] = useState(false);
  const [variantSelections, setVariantSelections] = useState<Record<string, string>>({});
  const [isOrderingOpen, setIsOrderingOpen] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [deliveryCharge, setDeliveryCharge] = useState(DEFAULT_DELIVERY_CHARGE);
  const [etaMinutes, setEtaMinutes] = useState(DEFAULT_ETA_MINUTES);
  const [orderWindows, setOrderWindows] = useState<OrderWindow[]>([]);
  const [firstOrderDiscountEnabled, setFirstOrderDiscountEnabled] = useState(false);
  const [firstOrderDiscountRate, setFirstOrderDiscountRate] = useState(15);
  const [isFirstOrder, setIsFirstOrder] = useState(false);
  const [promoActive, setPromoActive] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoRate, setPromoRate] = useState(0);
  const [promoExpiresAt, setPromoExpiresAt] = useState("");

  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setFavorites(parsed.map((entry) => String(entry)));
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!session) return;

    let isMounted = true;

    const loadOrderingStatus = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/shop/ordering-status`);
        if (!isMounted) return;
        setIsOrderingOpen(Boolean(response.data?.isOrderingOpen));
        if (Number(response.data?.deliveryCharge) >= 0) {
          setDeliveryCharge(Number(response.data.deliveryCharge));
        }
        if (Number(response.data?.etaMinutes) > 0) {
          setEtaMinutes(Number(response.data.etaMinutes));
        }
        if (Array.isArray(response.data?.orderWindows)) {
          setOrderWindows(response.data.orderWindows as OrderWindow[]);
        }
        if (Boolean(response.data?.firstOrderDiscountEnabled)) {
          setFirstOrderDiscountEnabled(true);
          setFirstOrderDiscountRate(Number(response.data?.firstOrderDiscountRate || 15));
        } else {
          setFirstOrderDiscountEnabled(false);
        }
      } catch {
        if (!isMounted) return;
        setIsOrderingOpen(true);
      }
    };

    const loadSettings = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/outlets/1/settings`);
        if (!isMounted) return;
        const settings = response.data?.settings || response.data || {};
        if (Number(settings?.deliveryCharge) >= 0) setDeliveryCharge(Number(settings.deliveryCharge));
        if (Number(settings?.etaMinutes) > 0) setEtaMinutes(Number(settings.etaMinutes));
        if (Array.isArray(settings?.orderWindows)) setOrderWindows(settings.orderWindows as OrderWindow[]);
        setFirstOrderDiscountEnabled(Boolean(settings?.firstOrderDiscountEnabled));
        if (Number(settings?.firstOrderDiscountRate) > 0) setFirstOrderDiscountRate(Number(settings.firstOrderDiscountRate));
        setPromoActive(Boolean(settings?.promoActive));
        setPromoCode(String(settings?.promoDiscountCode || "").trim());
        setPromoRate(Number(settings?.promoDiscountRate || 0));
        setPromoExpiresAt(String(settings?.promoExpiresAt || ""));
      } catch {
        // keep defaults
      }
    };

    const loadFirstOrderFlag = async () => {
      try {
        const flag = await AsyncStorage.getItem(`${FIRST_ORDER_KEY}:${session.phone}`);
        if (!isMounted) return;
        setIsFirstOrder(!flag);
      } catch {
        if (!isMounted) return;
        setIsFirstOrder(true);
      }
    };

    loadOrderingStatus();
    loadSettings();
    loadFirstOrderFlag();
    const intervalId = setInterval(() => {
      loadOrderingStatus();
      loadFirstOrderFlag();
    }, 15000);
    const settingsIntervalId = setInterval(loadSettings, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      clearInterval(settingsIntervalId);
    };
  }, [session]);

  const toggleFavorite = (itemName: string) => {
    setFavorites((prev) => {
      const next = prev.includes(itemName)
        ? prev.filter((entry) => entry !== itemName)
        : [...prev, itemName];
      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next)).catch(() => null);
      return next;
    });
  };

  const markFirstOrderUsed = () => {
    if (!session?.phone) {
      setIsFirstOrder(false);
      return;
    }
    setIsFirstOrder(false);
    AsyncStorage.setItem(`${FIRST_ORDER_KEY}:${session.phone}`, "1").catch(() => null);
  };

  const validatePromoCode = (code: string) => {
    const normalized = (code || "").trim().toLowerCase();
    if (!promoActive || !promoCode || promoRate <= 0) return false;
    if (normalized !== promoCode.toLowerCase()) return false;
    if (promoExpiresAt) {
      const expires = Date.parse(promoExpiresAt);
      if (!Number.isNaN(expires) && Date.now() > expires) return false;
    }
    return true;
  };

  const addToCart = (item: MenuItem, openCart = true) => {
    if (!isOrderingOpen) {
      Alert.alert("Ordering closed", "The shop is currently closed. Please try again later.");
      return;
    }

    if (item.available === false) {
      Alert.alert("Item unavailable", "This item is currently unavailable.");
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
          id: `${item.id}-${selectedVariant}`,
          menuItemId: item.id,
          name: item.name,
          variant: selectedVariant,
          quantity: 1,
          unitPrice: selectedPrice,
          totalPrice: selectedPrice,
        },
      ];
    });
    if (openCart) setCartVisible(true);
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

  return (
    <CartContext.Provider
      value={{
        cartItems,
        setCartItems,
        cartVisible,
        setCartVisible,
        variantSelections,
        setVariantSelections,
        isOrderingOpen,
        setIsOrderingOpen,
        addToCart,
        updateQuantity,
        favorites,
        toggleFavorite,
        deliveryCharge,
        etaMinutes,
        orderWindows,
        firstOrderDiscountEnabled,
        firstOrderDiscountRate,
        isFirstOrder,
        markFirstOrderUsed,
        promoActive,
        promoCode,
        promoRate,
        promoExpiresAt,
        validatePromoCode,
      }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}