import axios from "axios";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";

import { useSession } from "@/context/session-context";
import type { CartItem, MenuItem } from "@/types/menu";
import { API_BASE_URL } from "@/utils/api";

type CartContextType = {
  cartItems: CartItem[];
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  cartVisible: boolean;
  setCartVisible: (visible: boolean) => void;
  variantSelections: Record<string, string>;
  setVariantSelections: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isOrderingOpen: boolean;
  setIsOrderingOpen: (open: boolean) => void;
  addToCart: (item: MenuItem) => void;
  updateQuantity: (id: string, delta: number) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartVisible, setCartVisible] = useState(false);
  const [variantSelections, setVariantSelections] = useState<Record<string, string>>({});
  const [isOrderingOpen, setIsOrderingOpen] = useState(true);

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

  const addToCart = (item: MenuItem) => {
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