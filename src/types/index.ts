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
  salesCount?: number;
  createdAt?: string;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isTopSelling?: boolean;
}

export interface CartItem {
  productId: string;
  quantity: number;
  product: Product;
}

export type EscrowStatus = "HELD" | "RELEASED" | "REFUNDED";
export type PayoutStatus = "ON_HOLD" | "RELEASED" | "REFUNDED";

export interface Order {
  id: string;
  customerId: string;
  merchantId: string;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItem[];
  paymentMethod: PaymentMethod;
  paymentType?: PaymentType;
  tradeAssurance?: boolean;
  insuranceEnabled?: boolean;
  shipping?: {
    methodId: string;
    methodName: string;
    cost: number;
    estimatedDays: number;
  };
  tracking?: {
    trackingNumber: string;
    carrier: string;
    events: Array<{ status: string; at: string; note?: string }>;
  };
  invoices?: {
    orderInvoiceHtml?: string;
    proformaInvoiceHtml?: string;
    generatedAt: string;
  };
  lcRequestId?: string;
  lcStatus?: LcStatusType;
  disputeStatus?: DisputeStatus;
  insuranceClaimStatus?: InsuranceClaimStatus;
  paymentStatus: PaymentStatus;
  escrowStatus?: EscrowStatus;
  payoutStatus?: PayoutStatus;
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
export type PaymentMethod = 'CARD' | 'APPLE_PAY' | 'BANK_TRANSFER' | 'COD' | 'ESCROW' | 'LC';
export type PaymentType = 'escrow' | 'lc' | 'card' | 'bank';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type LcStatusType = 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SETTLED';
export type DisputeStatus = 'NONE' | 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';
export type InsuranceClaimStatus = 'NONE' | 'OPEN' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface LCRequest {
  id: string;
  orderId: string;
  buyerId: string;
  merchantId: string;
  amount: number;
  currency: string;
  status: LcStatusType;
  createdAt: string;
}

export interface LCDocument {
  id: string;
  lcRequestId: string;
  name: string;
  url: string;
  uploadedAt: string;
}

export interface LCStatus {
  id: string;
  lcRequestId: string;
  status: LcStatusType;
  note?: string;
  updatedAt: string;
}

export interface Dispute {
  id: string;
  orderId: string;
  reason: string;
  description: string;
  status: DisputeStatus;
  createdAt: string;
}

export interface InsuranceClaim {
  id: string;
  orderId: string;
  claimAmount: number;
  status: InsuranceClaimStatus;
  createdAt: string;
}
