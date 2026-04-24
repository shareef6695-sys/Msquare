import { MOCK_ESCROW_ORDERS } from "@/data/mockOrders";
import { getComplianceConfig, getCustomerById, getMerchantById } from "@/services/adminService";
import { sendDashboardNotification } from "@/services/emailService";
import {
  Address,
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

const startOfDayUtc = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

const daysUntil = (expiryDate: string, now = new Date()) => {
  const expiry = new Date(`${expiryDate}T00:00:00.000Z`);
  const diffMs = startOfDayUtc(expiry) - startOfDayUtc(now);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

const isExpiredInGrace = (
  doc: { expiryDate: string; overrideExpiry?: string; status?: string },
  graceDays: number,
  now = new Date(),
) => {
  if (doc.status === "rejected" || doc.status === "under_review") return false;
  const effective = doc.overrideExpiry ?? doc.expiryDate;
  const dte = daysUntil(effective, now);
  return dte < 0 && Math.abs(dte) <= graceDays;
};

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

const formatMoney = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

const buildInvoiceHtml = (input: { order: Order; type: "order" | "proforma"; generatedAt: string }) => {
  const title = input.type === "proforma" ? "Proforma Invoice" : "Order Invoice";
  const lines = input.order.items
    .map(
      (i) => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 700; color: #111827;">${i.productName}</div>
            <div style="font-size: 12px; color: #6b7280;">Qty ${i.quantity}</div>
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; white-space: nowrap;">${formatMoney(i.price)}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; white-space: nowrap;">${formatMoney(i.price * i.quantity)}</td>
        </tr>
      `.trim(),
    )
    .join("");

  const shippingCost = input.order.shipping?.cost ?? 0;
  const subtotal = input.order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = input.order.totalAmount;
  const tax = Math.max(0, total - subtotal - shippingCost);

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${title} - ${input.order.id}</title>
    </head>
    <body style="margin:0; padding: 24px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#111827; background:#f3f4f6;">
      <div style="max-width: 880px; margin: 0 auto; background:#fff; border: 1px solid #e5e7eb; border-radius: 16px; overflow:hidden;">
        <div style="padding: 24px; border-bottom: 1px solid #f3f4f6; display:flex; justify-content: space-between; gap: 16px;">
          <div>
            <div style="font-weight: 900; font-size: 20px;">MSquare</div>
            <div style="font-size: 12px; color:#6b7280; margin-top: 4px;">Mock document for demo/testing only</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight: 900; font-size: 16px;">${title}</div>
            <div style="font-size: 12px; color:#6b7280; margin-top: 4px;">Order: ${input.order.id}</div>
            <div style="font-size: 12px; color:#6b7280;">Generated: ${new Date(input.generatedAt).toLocaleString()}</div>
          </div>
        </div>
        <div style="padding: 24px;">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px;">
            <div style="border: 1px solid #e5e7eb; border-radius: 14px; padding: 14px;">
              <div style="font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color:#6b7280; font-weight: 800;">Ship To</div>
              <div style="font-weight: 800; margin-top: 6px;">${input.order.shippingAddress.street}</div>
              <div style="font-size: 12px; color:#374151; margin-top: 4px;">${input.order.shippingAddress.city}, ${input.order.shippingAddress.state}</div>
              <div style="font-size: 12px; color:#374151;">${input.order.shippingAddress.country} • ${input.order.shippingAddress.zipCode}</div>
            </div>
            <div style="border: 1px solid #e5e7eb; border-radius: 14px; padding: 14px;">
              <div style="font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color:#6b7280; font-weight: 800;">Payment</div>
              <div style="font-weight: 800; margin-top: 6px;">Method: ${input.order.paymentMethod}</div>
              <div style="font-size: 12px; color:#374151; margin-top: 4px;">Status: ${input.order.paymentStatus}</div>
              <div style="font-size: 12px; color:#374151;">Trade Assurance: ${input.order.tradeAssurance ? "Enabled" : "Not enabled"}</div>
            </div>
          </div>

          <table style="width:100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 14px; overflow:hidden;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="text-align:left; padding: 10px 12px; font-size: 12px; color:#6b7280; letter-spacing: 0.08em; text-transform: uppercase;">Item</th>
                <th style="text-align:right; padding: 10px 12px; font-size: 12px; color:#6b7280; letter-spacing: 0.08em; text-transform: uppercase;">Unit</th>
                <th style="text-align:right; padding: 10px 12px; font-size: 12px; color:#6b7280; letter-spacing: 0.08em; text-transform: uppercase;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${lines}
            </tbody>
          </table>

          <div style="display:flex; justify-content:flex-end; margin-top: 16px;">
            <div style="min-width: 320px; border: 1px solid #e5e7eb; border-radius: 14px; padding: 14px; background:#fff;">
              <div style="display:flex; justify-content: space-between; font-size: 12px; color:#374151;">
                <span>Subtotal</span><span style="font-weight:800;">${formatMoney(subtotal)}</span>
              </div>
              <div style="display:flex; justify-content: space-between; font-size: 12px; color:#374151; margin-top: 8px;">
                <span>Shipping</span><span style="font-weight:800;">${formatMoney(shippingCost)}</span>
              </div>
              <div style="display:flex; justify-content: space-between; font-size: 12px; color:#374151; margin-top: 8px;">
                <span>Tax</span><span style="font-weight:800;">${formatMoney(tax)}</span>
              </div>
              <div style="height:1px; background:#f3f4f6; margin: 12px 0;"></div>
              <div style="display:flex; justify-content: space-between;">
                <span style="font-weight:900;">Total</span><span style="font-weight:900;">${formatMoney(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <script>window.focus();</script>
    </body>
  </html>
  `.trim();
};

const pushTrackingEvent = (order: Order, status: string, note?: string): Order => {
  const tracking = order.tracking ?? { trackingNumber: `TRK-${Math.floor(1000000 + Math.random() * 9000000)}`, carrier: "MSquare Logistics", events: [] };
  const nowIso = new Date().toISOString();
  const events = [...(tracking.events ?? []), { status, at: nowIso, note }];
  return { ...order, tracking: { ...tracking, events } };
};

const finalizeDelivery = (order: Order): Order => {
  const withTracking = pushTrackingEvent(order, "Delivered");
  const base: Order = {
    ...withTracking,
    status: "DELIVERED",
    paymentStatus: order.paymentStatus === "PENDING" ? "COMPLETED" : order.paymentStatus,
  };

  if (order.paymentType === "escrow" || order.paymentMethod === "ESCROW") {
    const escrowStatus: EscrowStatus = "RELEASED";
    const merchant = getMerchantById(order.merchantId);
    const payoutStatus: PayoutStatus = merchant?.payoutHold ? "ON_HOLD" : "RELEASED";
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
  shipping?: Order["shipping"];
  shippingAddress?: Address;
}): Order => {
  const orders = loadOrders();
  const merchantId = input.merchantId ?? "m1";
  const merchant = getMerchantById(merchantId);
  if (merchant?.restrictionLevel === "full_hold") {
    throw new Error("Merchant is on compliance hold. New orders are temporarily unavailable.");
  }
  const config = getComplianceConfig();
  const graceBlocked =
    Boolean(merchant?.complianceDocuments?.some((d) => isExpiredInGrace(d, config.gracePeriodDays))) &&
    !config.limitedOperations.merchant.allowNewOrders;
  if (graceBlocked) {
    throw new Error("Merchant has limited operations during the compliance grace period. New orders are temporarily unavailable.");
  }
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

  const generatedAt = new Date().toISOString();
  const baseOrder: Order = {
    id,
    customerId: input.customerId ?? "cust_guest",
    merchantId,
    status: paymentStatus === "COMPLETED" ? "PROCESSING" : "PENDING",
    totalAmount: input.totalAmount,
    items: input.items,
    paymentMethod: input.paymentMethod,
    paymentType,
    tradeAssurance,
    insuranceEnabled: input.insuranceEnabled ?? false,
    shipping: input.shipping,
    lcStatus: defaultLcStatus,
    disputeStatus: defaultDisputeStatus,
    insuranceClaimStatus: defaultInsuranceClaimStatus,
    paymentStatus,
    escrowStatus,
    payoutStatus,
    createdAt: now,
    shippingAddress:
      input.shippingAddress ?? ({
        id: `addr_${id}`,
        street: "Customer Address",
        city: "Riyadh",
        state: "Riyadh",
        zipCode: "00000",
        country: "Saudi Arabia",
      } satisfies Address),
    invoices: {
      orderInvoiceHtml: "",
      proformaInvoiceHtml: "",
      generatedAt,
    },
  };
  const withPlaced = pushTrackingEvent(baseOrder, "Order Placed");
  const invoices = {
    orderInvoiceHtml: buildInvoiceHtml({ order: withPlaced, type: "order", generatedAt }),
    proformaInvoiceHtml: paymentType === "lc" ? buildInvoiceHtml({ order: withPlaced, type: "proforma", generatedAt }) : undefined,
    generatedAt,
  };
  const newOrder: Order = { ...withPlaced, invoices };

  const next = [newOrder, ...orders];
  saveOrders(next);
  const merchantEmail = merchant?.email;
  const customerEmail = input.customerId ? getCustomerById(input.customerId)?.email : undefined;
  if (merchantEmail) {
    void sendDashboardNotification({
      to: merchantEmail,
      title: "New order",
      message: `New order received: ${newOrder.id} (${formatMoney(newOrder.totalAmount)}).`,
      meta: { event: "new_order", orderId: newOrder.id, merchantId },
    });
  }
  if (customerEmail) {
    void sendDashboardNotification({
      to: customerEmail,
      title: "Order placed",
      message: `Your order ${newOrder.id} has been placed successfully.`,
      meta: { event: "order_placed", orderId: newOrder.id, customerId: input.customerId },
    });
  }
  return newOrder;
};

export const markOrderShipped = (orderId: string): Order[] => {
  const orders = loadOrders();
  return withUpdatedOrder(orders, orderId, (order) => {
    const nextStatus: OrderStatus = "SHIPPED";
    if (order.status === "CANCELLED" || order.status === "DELIVERED") return order;
    let withTracking = pushTrackingEvent(order, "Shipped");
    withTracking = pushTrackingEvent(withTracking, "Out for Delivery", "Shipment in transit.");
    return { ...withTracking, status: nextStatus };
  });
};

export const confirmDeliveryAndRelease = (orderId: string): Order[] => {
  const orders = loadOrders();
  return withUpdatedOrder(orders, orderId, (order) => {
    if (order.status !== "SHIPPED") return order;
    return finalizeDelivery(order);
  });
};

export const patchOrder = (orderId: string, patch: Partial<Order>): Order[] => {
  const orders = loadOrders();
  return withUpdatedOrder(orders, orderId, (order) => ({ ...order, ...patch }));
};

export const setOrderLcStatus = (orderId: string, status: LcStatusType): Order[] => {
  const patch: Partial<Order> = { lcStatus: status };
  if (status === "APPROVED") patch.status = "PROCESSING";
  if (status === "SETTLED") {
    patch.paymentStatus = "COMPLETED";
    patch.status = "PROCESSING";
  }
  return patchOrder(orderId, patch);
};

export const setOrderDisputeStatus = (orderId: string, status: DisputeStatus): Order[] => {
  return patchOrder(orderId, { disputeStatus: status });
};
