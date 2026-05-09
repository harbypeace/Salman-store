export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stockQuantity: number;
  inStock: boolean;
}

export interface Product {
  id?: string;
  name: string;
  description: string;
  price: number; // Base price
  imageUrl: string;
  category: string;
  inStock: boolean;
  stockQuantity?: number;
  variants?: ProductVariant[];
  createdAt?: any;
  updatedAt?: any;
}

export interface WishlistItem {
  productId: string;
  addedAt: any;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface Order {
  id?: string;
  userId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;
  shippingCarrier?: string;
  items: OrderItem[];
  createdAt?: any;
  updatedAt?: any;
}
