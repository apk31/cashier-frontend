import { create } from 'zustand';

interface CartItem {
  cart_item_id: string;
  variant_id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  discount: number; // Per-item discount
  has_open_price?: boolean;
}

interface CartState {
  items: CartItem[];
  memberInfo: { id: string; phone: string; name: string } | undefined;
  voucher: { code: string; type: 'PERCENTAGE' | 'FIXED'; value: number } | undefined;
  voucherError: string | undefined;
  
  // Actions
  addItem: (item: Omit<CartItem, 'quantity' | 'discount' | 'cart_item_id'>) => void;
  updateQuantity: (cart_item_id: string, qty: number) => void;
  removeItem: (cart_item_id: string) => void;
  setMember: (memberInfo: { id: string; phone: string; name: string } | undefined) => void;
  applyVoucher: (code: string) => boolean; // legacy mock
  applyVoucherData: (voucher: { code: string; type: 'PERCENTAGE' | 'FIXED'; value: number }) => void;
  removeVoucher: () => void;
  clearCart: () => void;

  // Computed totals (Zustand lets us derive these easily in the UI)
  getSubtotal: () => number;
  getVoucherDiscount: () => number;
  getGrandTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  memberInfo: undefined,
  voucher: undefined,
  voucherError: undefined,

  addItem: (newItem) => set((state) => {
    // For regular items, we group by variant_id. For open price items, we group by variant_id AND price.
    const existingItemIndex = state.items.findIndex(i => 
      i.variant_id === newItem.variant_id && 
      (!newItem.has_open_price || i.price === newItem.price)
    );

    if (existingItemIndex > -1) {
      // Increase qty if already in cart with same constraints
      const updatedItems = [...state.items];
      updatedItems[existingItemIndex].quantity += 1;
      return { items: updatedItems };
    }
    
    // Add new item with a unique cart_item_id
    const cart_item_id = `${newItem.variant_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return { items: [...state.items, { ...newItem, cart_item_id, quantity: 1, discount: 0 }] };
  }),

  updateQuantity: (cart_item_id, quantity) => set((state) => ({
    items: state.items.map(i => i.cart_item_id === cart_item_id ? { ...i, quantity } : i)
  })),

  removeItem: (cart_item_id) => set((state) => ({
    items: state.items.filter(i => i.cart_item_id !== cart_item_id)
  })),

  setMember: (memberInfo) => set({ memberInfo }),
  
  applyVoucher: (code) => {
    // Mock Validation Logic
    if (code === 'PROMO20') {
      set({ 
        voucher: { code, type: 'PERCENTAGE', value: 20 },
        voucherError: undefined 
      });
      return true;
    } else if (code === 'DISKON50K') {
      set({ 
        voucher: { code, type: 'FIXED', value: 50000 },
        voucherError: undefined 
      });
      return true;
    }
    
    set({ voucher: undefined, voucherError: 'Invalid voucher code' });
    return false;
  },

  removeVoucher: () => set({ voucher: undefined, voucherError: undefined }),

  applyVoucherData: (v) => set({ voucher: v, voucherError: undefined }),

  clearCart: () => set({ items: [], memberInfo: undefined, voucher: undefined, voucherError: undefined }),

  getSubtotal: () => {
    return get().items.reduce((total, item) => total + ((item.price * item.quantity) - item.discount), 0);
  },

  getVoucherDiscount: () => {
    const { voucher, getSubtotal } = get();
    if (!voucher) return 0;
    
    const subtotal = getSubtotal();
    if (voucher.type === 'PERCENTAGE') {
      return subtotal * (voucher.value / 100);
    }
    // FIXED
    return Math.min(subtotal, voucher.value);
  },

  getGrandTotal: () => {
    const { getSubtotal, getVoucherDiscount } = get();
    return Math.max(0, getSubtotal() - getVoucherDiscount());
  }
}));