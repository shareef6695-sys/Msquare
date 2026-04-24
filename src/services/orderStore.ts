import { MOCK_ESCROW_ORDERS } from "@/data/mockOrders";
import {
  DisputeStatus,
  EscrowStatus,
  InsuranceClaimStatus,
  LcStatusType,
  Order,
  OrderStatus,
  PaymentType,
  PayoutStatus,
} from "@/types";

const STORAGE_KEY = "msquare.orders.v1";

const isBrowser = () => typeof window !== "undefined";

const normalizeOrders = (orders: unknown): Order[] => {
  if (!Array.isArray(orders)) return [];
  return orders.filter(Boolean) as Order[];
};

export const loadOrders = (): Order[] => {
  if (!isBrowser()) return MOCK_ESCROW_ORDERS;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return MOCK_ESCROW_ORDERS;
  try {
    return normalizeOrders(JSON.parse(raw));
  } catch {
    return MOCK_ESCROW_ORDERS;
  }
};

export const saveOrders = (orders: Order[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
};

export const seedOrdersIfEmpty = (): Order[] => {
  const existing = loadOrders();
  if (existing.length > 0) return existing;
  saveOrders(MOCK_ESCROW_ORDERS);
  return MOCK_ESCROW_ORDERS;
};

const withUpdatedOrder = (orders: Order[], orderId: string, updater: (order: Order) => Order): Order[] => {
  const next = orders.map((o) => (o.id === orderId ? updater(o) : o));
  saveOrders(next);
  return next;
};

const finalizeDelivery = (order: Order): Order => {
  const base: Order = {
    ...order,
    status: "DELIVERED",
    paymentStatus: order.paymentStatus === "PENDING" ? "COMPLETED" : order.paymentStatus,
  };

  if (order.paymentType === "escrow" || order.paymentMethod === "ESCROW") {
    const escrowStatus: EscrowStatus = "RELEASED";
    const payoutStatus: PayoutStatus = "RELEASED";
    return { ...base, escrowStatus, payoutStatus };
  }

  return base;
};

export const createEscrowOrder = (input: {
  items: Order["items"];
  totalAmount: number;
  paymentMethod: Order["paymentMethod"];
  customerId?: string;
  merchantId?: string;
  tradeAssurance?: boolean;
  insuranceEnabled?: boolean;
}): Order => {
  const orders = loadOrders();
  const id = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
  const now = new Date().toISOString().slice(0, 10);

  const paymentType: PaymentType =
    input.paymentMethod === "ESCROW"
      ? "escrow"
      : input.paymentMethod === "LC"
        ? "lc"
        : input.paymentMethod === "BANK_TRANSFER" || input.paymentMethod === "COD"
          ? "bank"
          : "card";

  const tradeAssurance =
    input.tradeAssurance ?? (input.paymentMethod === "ESCROW" || input.paymentMethod === "LC");

  const paymentStatus =
    input.paymentMethod === "COD" || input.paymentMethod === "LC" ? ("PENDING" as const) : ("COMPLETED" as const);

  const defaultLcStatus: LcStatusType | undefined = paymentType === "lc" ? "DRAFT" : undefined;
  const defaultDisputeStatus: DisputeStatus = "NONE";
  const defaultInsuranceClaimStatus: InsuranceClaimStatus = "NONE";

  const escrowStatus: EscrowStatus | undefined = paymentType === "escrow" ? "HELD" : undefined;
  const payoutStatus: PayoutStatus | undefined = paymentType === "escrow" ? "ON_HOLD" : undefined;

  const newOrder: Order = {
    id,
    customerId: input.customerId ?? "cust_guest",
    merchantId: input.merchantId ?? "m1",
    status: paymentStatus === "COMPLETED" ? "PROCESSING" : "PENDING",
    totalAmount: input.totalAmount,
    items: input.items,
    paymentMethod: input.paymentMethod,
    paymentType,
    tradeAssurance,
    insuranceEnabled: input.insuranceEnabled ?? false,
    lcStatus: defaultLcStatus,
    disputeStatus: defaultDisputeStatus,
    insuranceClaimStatus: defaultInsuranceClaimStatus,
    paymentStatus,
    escrowStatus,
    payoutStatus,
    createdAt: now,
    shippingAddress: {
      id: `addr_${id}`,
      street: "Customer Address",
      city: "Riyadh",
      state: "Riyadh",
      zipCode: "00000",
      country: "Saudi Arabia",
    },
  };

  const next = [newOrder, ...orders];
  saveOrders(next);
  return newOrder;
};

export const markOrderShipped = (orderId: string): Order[] => {
  const orders = loadOrders();
  return withUpdatedOrder(orders, orderId, (order) => {
    const nextStatus: OrderStatus = "SHIPPED";
    if (order.status === "CANCELLED" || order.status === "DELIVERED") return order;
    return { ...order, status: nextStatus };
  });
};

export const confirmDeliveryAndRelease = (orderId: string): Order[] => {
  const orders = loadOrders();
  return withUpdatedOrder(orders, orderId, (order) => {
    if (order.status !== "SHIPPED") return order;
    return finalizeDelivery(order);
  });
};
