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
