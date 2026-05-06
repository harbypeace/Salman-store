export interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  inStock: boolean;
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
