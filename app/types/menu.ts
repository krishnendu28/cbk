export type MenuItem = {
  id: number;
  name: string;
  prices: Record<string, number>;
  image?: string;
  available?: boolean;
};

export type MenuCategory = {
  id: string;
  title: string;
  items: MenuItem[];
};

export type CartItem = {
  id: string;
  menuItemId: number;
  name: string;
  variant: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};