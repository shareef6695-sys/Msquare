export type UserRole = 'ADMIN' | 'MERCHANT' | 'CUSTOMER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  image?: string;
}

export interface Merchant {
  id: string;
  userId: string;
  storeName: string;
  logo?: string;
  description?: string;
  rating: number;
  location: string;
  brandColors?: {
    primary: string;
    secondary: string;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  minOrderQuantity: number;
  stock: number;
  categoryId: string;
  merchantId: string;
  merchantName: string;
  images: string[];
  rating: number;
  reviewsCount: number;
  location: string;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isTopSelling?: boolean;
}

export interface CartItem {
  productId: string;
  quantity: number;
  product: Product;
}

export interface Order {
  id: string;
  customerId: string;
  merchantId: string;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItem[];
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: string;
  shippingAddress: Address;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentMethod = 'CARD' | 'APPLE_PAY' | 'COD' | 'BANK_TRANSFER' | 'LC';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}
