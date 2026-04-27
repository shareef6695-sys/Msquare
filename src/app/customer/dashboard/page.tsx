"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CustomerLayout } from "@/features/customer/CustomerLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getResolvedCartItems } from "@/services/cartStore";
import { loadOrders, seedOrdersIfEmpty } from "@/services/orderStore";
import { getUnreadCountForTargets } from "@/services/emailService";
import { loadSession } from "@/services/authStore";
import { type Address, type CurrencyCode, type Order } from "@/types";
import { useExchangeRatesUsd } from "@/services/exchangeRateService";
import { SUPPORTED_CURRENCIES, convertCurrency, formatCurrency } from "@/utils/currencyConverter";
import { getMerchantById } from "@/services/adminService";
import { listProducts } from "@/services/productService";
import { MOCK_CATEGORIES } from "@/data/mockCategories";
import { AlertTriangle, Bell, FileText, Gavel, MapPin, ShieldCheck, ShoppingBag, Sparkles, Truck } from "lucide-react";

const defaultCurrency = (): CurrencyCode => {
  const raw = (process.env.NEXT_PUBLIC_DEFAULT_CURRENCY as CurrencyCode | undefined) ?? "SAR";
  return SUPPORTED_CURRENCIES.includes(raw) ? raw : "SAR";
};

type LcUiState = Record<
  string,
  {
    uploaded: boolean;
    status: string;
    lastAction?: string;
    fileName?: string;
    invoiceUrl?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    shipmentDate?: string;
    certificateText?: string;
    insuranceCoveragePercent?: number;
  }
>;
type DisputeState = Record<string, { status: string; reason: string; description: string }>;
type ClaimState = Record<string, { status: string; amount: string; description: string }>;

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const statusBadge = (status: string) => {
  const s = status.toUpperCase();
  if (s === "DELIVERED" || s === "COMPLETED" || s === "RELEASED") return "border-green-200/70 bg-green-50 text-green-800";
  if (s === "SHIPPED") return "border-blue-200/70 bg-blue-50 text-blue-800";
  if (s === "PROCESSING" || s === "PAID" || s.includes("UNDER")) return "border-amber-200/70 bg-amber-50 text-amber-800";
  if (s === "CANCELLED" || s === "FAILED" || s === "REJECTED") return "border-red-200/70 bg-red-50 text-red-700";
  return "border-gray-200/70 bg-gray-50 text-gray-700";
};

const monthKey = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown";
  const y = d.getFullYear();
  const m = d.getMonth();
  const label = d.toLocaleString(undefined, { month: "short" });
  return `${y}-${String(m + 1).padStart(2, "0")}|${label}`;
};

const MiniBarChart = ({ title, data }: { title: string; data: Array<{ label: string; value: number }> }) => {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="rounded-3xl border border-gray-200/60 bg-white p-6">
      <div className="text-sm font-black text-gray-900">{title}</div>
      <div className="mt-4 space-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-3">
            <div className="w-16 text-xs font-semibold text-gray-500">{d.label}</div>
            <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-primary-600" style={{ width: `${Math.max(3, (d.value / max) * 100)}%` }} />
            </div>
            <div className="w-12 text-right text-xs font-black text-gray-700">{Math.round(d.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function CustomerDashboardPage() {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>(defaultCurrency());
  const [loading, setLoading] = useState(true);
  const [lcState, setLcState] = useState<LcUiState>({});
  const [disputeState, setDisputeState] = useState<DisputeState>({});
  const [claimState, setClaimState] = useState<ClaimState>({});
  const [savedMerchants, setSavedMerchants] = useState<string[]>([]);

  const { loading: ratesLoading, result: ratesResult } = useExchangeRatesUsd();
  const ratesUsd = ratesResult?.ratesUsd;

  useEffect(() => {
    seedOrdersIfEmpty();
    const session = loadSession();
    if (!session || session.user.role !== "CUSTOMER") return;
    setCustomerId(session.user.id);
    setEmail(session.user.email);
    setPhone(session.user.phone ?? null);
    setOrders(loadOrders().filter((o) => o.customerId === session.user.id));
    window.setTimeout(() => setLoading(false), 250);
  }, []);

  useEffect(() => {
    if (!customerId || typeof window === "undefined") return;
    const key = `msquare.currency.customer.${customerId}.v1`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    if (SUPPORTED_CURRENCIES.includes(raw as CurrencyCode)) setDisplayCurrency(raw as CurrencyCode);
  }, [customerId]);

  useEffect(() => {
    if (!customerId || typeof window === "undefined") return;
    const key = `msquare.currency.customer.${customerId}.v1`;
    window.localStorage.setItem(key, displayCurrency);
  }, [customerId, displayCurrency]);

  useEffect(() => {
    if (!customerId || typeof window === "undefined") return;
    const key = `msquare.addresses.${customerId}.v1`;
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      setAddresses([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Address[];
      setAddresses(Array.isArray(parsed) ? parsed : []);
    } catch {
      setAddresses([]);
    }
  }, [customerId]);

  useEffect(() => {
    if (!customerId || typeof window === "undefined") return;
    setLcState(safeJsonParse<LcUiState>(window.localStorage.getItem("msquare.lcState.v1"), {}));
    setDisputeState(safeJsonParse<DisputeState>(window.localStorage.getItem("msquare.disputes.v1"), {}));
    setClaimState(safeJsonParse<ClaimState>(window.localStorage.getItem("msquare.insuranceClaims.v1"), {}));
    const savedKey = `msquare.customer.savedMerchants.${customerId}.v1`;
    const saved = safeJsonParse<string[]>(window.localStorage.getItem(savedKey), []);
    if (saved.length > 0) {
      setSavedMerchants(saved);
      return;
    }
    const inferred = Array.from(new Set(loadOrders().filter((o) => o.customerId === customerId).map((o) => o.merchantId))).slice(0, 4);
    window.localStorage.setItem(savedKey, JSON.stringify(inferred));
    setSavedMerchants(inferred);
  }, [customerId]);

  useEffect(() => {
    if (!customerId || typeof window === "undefined") return;
    const savedKey = `msquare.customer.savedMerchants.${customerId}.v1`;
    window.localStorage.setItem(savedKey, JSON.stringify(savedMerchants));
  }, [customerId, savedMerchants]);

  const recentOrders = useMemo(() => {
    return [...orders].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, 5);
  }, [orders]);

  const activeOrders = useMemo(() => {
    return orders.filter((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED").length;
  }, [orders]);

  const nextTrackOrder = useMemo(() => {
    return [...orders]
      .filter((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED")
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))[0];
  }, [orders]);

  const trackingProgress = useMemo(() => {
    if (!nextTrackOrder) return null;
    const steps = ["Order placed", "Payment secured", "Processing", "Shipped", "Out for delivery", "Delivered"];
    const reached = (s: string) => {
      const o = nextTrackOrder;
      const events = o.tracking?.events ?? [];
      if (events.some((e) => e.status.toLowerCase() === s.toLowerCase())) return true;
      if (s === "Order placed") return true;
      if (s === "Payment secured") return o.paymentStatus === "COMPLETED" || ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(o.status);
      if (s === "Processing") return ["PROCESSING", "SHIPPED", "DELIVERED"].includes(o.status);
      if (s === "Shipped") return ["SHIPPED", "DELIVERED"].includes(o.status);
      if (s === "Out for delivery") return o.status === "DELIVERED";
      if (s === "Delivered") return o.status === "DELIVERED";
      return false;
    };
    return { order: nextTrackOrder, steps: steps.map((label) => ({ label, done: reached(label) })) };
  }, [nextTrackOrder]);

  const totalOrders = orders.length;
  const completedOrders = useMemo(() => orders.filter((o) => o.status === "DELIVERED").length, [orders]);
  const pendingPayments = useMemo(() => orders.filter((o) => o.paymentStatus === "PENDING").length, [orders]);

  const totalSpent = useMemo(() => {
    if (!ratesUsd) return orders.reduce((sum, o) => sum + (o.originalAmount ?? o.totalAmount ?? 0), 0);
    return orders.reduce((sum, o) => {
      const originalAmount = o.originalAmount ?? o.totalAmount ?? 0;
      const originalCurrency = (o.originalCurrency ?? defaultCurrency()) as CurrencyCode;
      return sum + convertCurrency(originalAmount, originalCurrency, displayCurrency, ratesUsd).convertedAmount;
    }, 0);
  }, [displayCurrency, orders, ratesUsd]);

  const disputesForOrders = useMemo(() => {
    const byOrder = new Set(orders.map((o) => o.id));
    return Object.entries(disputeState)
      .filter(([orderId]) => byOrder.has(orderId))
      .map(([orderId, d]) => ({ orderId, ...d }));
  }, [disputeState, orders]);

  const openDisputes = useMemo(() => disputesForOrders.filter((d) => String(d.status).toUpperCase() !== "RESOLVED").length, [disputesForOrders]);

  const claimsForOrders = useMemo(() => {
    const byOrder = new Set(orders.map((o) => o.id));
    return Object.entries(claimState)
      .filter(([orderId]) => byOrder.has(orderId))
      .map(([orderId, c]) => ({ orderId, ...c }));
  }, [claimState, orders]);

  const openClaims = useMemo(() => claimsForOrders.filter((c) => String(c.status).toUpperCase() !== "APPROVED").length, [claimsForOrders]);

  const lcOrders = useMemo(() => orders.filter((o) => o.paymentType === "lc" || o.paymentMethod === "LC"), [orders]);

  const lcStatusSummary = useMemo(() => {
    const statuses = lcOrders.map((o) => (o.lcStatus ?? lcState[o.id]?.status ?? "DRAFT").toString().toUpperCase());
    const under = statuses.filter((s) => ["DRAFT", "SUBMITTED", "BANK_REVIEW", "UNDER_REVIEW"].includes(s)).length;
    const approved = statuses.filter((s) => ["APPROVED", "ACCEPTED"].includes(s)).length;
    const settled = statuses.filter((s) => ["SETTLED", "PAID"].includes(s)).length;
    return { total: statuses.length, under, approved, settled };
  }, [lcOrders, lcState]);

  const unreadNotifications = useMemo(() => {
    const targets = [email, phone].filter(Boolean) as string[];
    return getUnreadCountForTargets(targets);
  }, [email, phone]);

  const cart = getResolvedCartItems();

  const productsById = useMemo(() => new Map(listProducts().map((p) => [p.id, p])), []);
  const categoryNameById = useMemo(() => new Map(MOCK_CATEGORIES.map((c) => [c.id, c.name])), []);
  const purchasedProductIds = useMemo(() => new Set(orders.flatMap((o) => o.items.map((i) => i.productId))), [orders]);

  const categorySpending = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      const originalCurrency = (o.originalCurrency ?? defaultCurrency()) as CurrencyCode;
      for (const it of o.items) {
        const p = productsById.get(it.productId);
        const key = p?.categoryId ?? "other";
        const amount = it.price * it.quantity;
        const converted = ratesUsd ? convertCurrency(amount, originalCurrency, displayCurrency, ratesUsd).convertedAmount : amount;
        map.set(key, (map.get(key) ?? 0) + converted);
      }
    }
    const named = Array.from(map.entries()).map(([categoryId, value]) => {
      const label = categoryId === "other" ? "Other" : categoryNameById.get(categoryId) ?? categoryId;
      return { categoryId, label, value };
    });
    named.sort((a, b) => b.value - a.value);
    return named.slice(0, 6).map((x) => ({ label: x.label, value: x.value }));
  }, [categoryNameById, displayCurrency, orders, productsById, ratesUsd]);

  const monthlySpending = useMemo(() => {
    const map = new Map<string, { label: string; value: number; ts: number }>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString(undefined, { month: "short" });
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}|${label}`;
      map.set(key, { label, value: 0, ts: d.getTime() });
    }
    for (const o of orders) {
      const mk = monthKey(o.createdAt);
      const entry = map.get(mk);
      if (!entry) continue;
      const originalAmount = o.originalAmount ?? o.totalAmount ?? 0;
      const originalCurrency = (o.originalCurrency ?? defaultCurrency()) as CurrencyCode;
      const converted = ratesUsd ? convertCurrency(originalAmount, originalCurrency, displayCurrency, ratesUsd).convertedAmount : originalAmount;
      entry.value += converted;
    }
    return Array.from(map.values()).sort((a, b) => a.ts - b.ts).map((x) => ({ label: x.label, value: x.value }));
  }, [displayCurrency, orders, ratesUsd]);

  const ordersByStatus = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) map.set(o.status, (map.get(o.status) ?? 0) + 1);
    const out = Array.from(map.entries()).map(([label, value]) => ({ label, value }));
    out.sort((a, b) => b.value - a.value);
    return out;
  }, [orders]);

  const deliveryPerformance = useMemo(() => {
    const delivered = orders.filter((o) => o.status === "DELIVERED");
    let onTime = 0;
    for (const o of delivered) {
      const created = Date.parse(o.createdAt);
      const deliveredAt = o.tracking?.events?.find((e) => e.status === "Delivered")?.at ?? o.tracking?.events?.find((e) => e.status === "DELIVERED")?.at;
      const deliveredTs = deliveredAt ? Date.parse(deliveredAt) : Number.NaN;
      const etaDays = o.shipping?.estimatedDays ?? 10;
      const due = created + etaDays * 24 * 60 * 60 * 1000;
      const actual = Number.isFinite(deliveredTs) ? deliveredTs : due;
      if (Number.isFinite(created) && actual <= due) onTime += 1;
    }
    const total = delivered.length;
    const late = Math.max(0, total - onTime);
    return { total, onTime, late };
  }, [orders]);

  const recommendedProducts = useMemo(() => {
    const all = listProducts();
    const byCategory = new Map<string, number>();
    for (const o of orders) {
      for (const it of o.items) {
        const p = productsById.get(it.productId);
        if (!p) continue;
        byCategory.set(p.categoryId, (byCategory.get(p.categoryId) ?? 0) + 1);
      }
    }
    const topCategories = Array.from(byCategory.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([id]) => id);
    const pool = all.filter((p) => !purchasedProductIds.has(p.id) && (topCategories.length ? topCategories.includes(p.categoryId) : true));
    return pool.sort(() => 0.5 - Math.random()).slice(0, 4);
  }, [orders, productsById, purchasedProductIds]);

  const protection = useMemo(() => {
    const escrowProtected = orders.filter((o) => o.paymentType === "escrow" || o.paymentMethod === "ESCROW").length;
    const insured = orders.filter((o) => Boolean(o.insuranceEnabled)).length;
    const disputesUnderReview = disputesForOrders.filter((d) => String(d.status).toUpperCase() === "UNDER_REVIEW").length;
    return { escrowProtected, lcOrders: lcOrders.length, insured, disputesUnderReview };
  }, [disputesForOrders, lcOrders.length, orders]);

  const docsSummary = useMemo(() => {
    const invoices = orders.filter((o) => Boolean(o.invoices?.orderInvoiceHtml)).length;
    const proformas = orders.filter((o) => Boolean(o.invoices?.proformaInvoiceHtml)).length;
    const lcDocs = lcOrders.filter((o) => Boolean(lcState[o.id]?.fileName || lcState[o.id]?.invoiceUrl)).length;
    const insuranceDocs = claimsForOrders.length;
    return { invoices, proformas, lcDocs, insuranceDocs };
  }, [claimsForOrders.length, lcOrders, lcState, orders]);

  const supportSummary = useMemo(() => {
    if (!customerId || typeof window === "undefined") return { tickets: 0 };
    const raw = window.localStorage.getItem(`msquare.supportTickets.customer.${customerId}.v1`);
    const tickets = safeJsonParse<Array<any>>(raw, []);
    return { tickets: tickets.length };
  }, [customerId]);

  return (
    <CustomerLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Customer Dashboard</h1>
          <p className="text-gray-500">Orders, tracking, documents, and protection status (mock).</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm shadow-gray-900/5">
            <div className="text-[11px] font-black uppercase tracking-widest text-gray-400">Currency</div>
            <select
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value as CurrencyCode)}
              className="mt-1 w-full bg-transparent text-sm font-black text-gray-900 focus:outline-none"
              disabled={!customerId}
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <Link href="/marketplace">
            <Button variant="outline">Browse marketplace</Button>
          </Link>
          <Link href="/customer/cart">
            <Button>Cart ({cart.items.length})</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-3 w-24 rounded bg-gray-100" />
                <div className="mt-4 h-7 w-28 rounded bg-gray-100" />
                <div className="mt-3 h-3 w-40 rounded bg-gray-100" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: "Total orders", value: String(totalOrders), icon: <ShoppingBag className="w-5 h-5" />, tone: "bg-blue-50 border-blue-200/60 text-blue-700" },
            { label: "Active orders", value: String(activeOrders), icon: <Truck className="w-5 h-5" />, tone: "bg-amber-50 border-amber-200/60 text-amber-800" },
            { label: "Completed", value: String(completedOrders), icon: <ShieldCheck className="w-5 h-5" />, tone: "bg-emerald-50 border-emerald-200/60 text-emerald-700" },
            { label: "Pending payments", value: String(pendingPayments), icon: <AlertTriangle className="w-5 h-5" />, tone: "bg-purple-50 border-purple-200/60 text-purple-700" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${s.tone}`}>{s.icon}</div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{s.label}</div>
                  <div className="text-xl font-black text-gray-900 mt-1">{s.value}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <div className="p-6 border-b border-gray-100/60 flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-black text-gray-900">Spending overview</div>
              <div className="text-sm text-gray-500 mt-1">Totals and monthly spending (mock).</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Total spending</div>
              <div className="text-xl font-black text-gray-900">{formatCurrency(totalSpent, displayCurrency)}</div>
              <div className="text-[11px] text-gray-500 mt-1">
                {ratesLoading ? (
                  <span>Loading exchange rate…</span>
                ) : ratesResult ? (
                  <span>
                    Converted using live exchange rate • Last updated: {new Date(ratesResult.updatedAt).toLocaleString()}
                    {ratesResult.usedFallback ? " • Using last available exchange rate" : ""}
                    {ratesResult.stale ? " • Rate may be outdated" : ""}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <CardContent className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MiniBarChart title="Monthly spending" data={monthlySpending} />
            <MiniBarChart title="Orders by status" data={ordersByStatus.map((x) => ({ label: x.label, value: x.value }))} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary-50 border border-primary-200/60 flex items-center justify-center text-primary-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-black text-gray-900">Payment protection</div>
                  <div className="text-sm text-gray-500 mt-1">Your orders are protected by MSquare Trade Assurance.</div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Escrow</div>
                  <div className="text-lg font-black text-gray-900 mt-1">{protection.escrowProtected}</div>
                </div>
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400">LC</div>
                  <div className="text-lg font-black text-gray-900 mt-1">{protection.lcOrders}</div>
                </div>
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Insured</div>
                  <div className="text-lg font-black text-gray-900 mt-1">{protection.insured}</div>
                </div>
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Disputes</div>
                  <div className="text-lg font-black text-gray-900 mt-1">{openDisputes}</div>
                </div>
              </div>
              <Link href="/customer/support" className="mt-5 block">
                <Button variant="outline" className="w-full">
                  Support & disputes
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-800">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-black text-gray-900">Notifications</div>
                  <div className="text-sm text-gray-500 mt-1">Unread: {unreadNotifications}</div>
                </div>
              </div>
              <Link href="/customer/notifications" className="mt-5 block">
                <Button variant="outline" className="w-full">
                  Open notification center
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <div className="p-6 border-b border-gray-100/60 flex items-center justify-between">
            <div className="text-lg font-black text-gray-900">Recent orders</div>
            <Link href="/customer/orders" className="text-sm font-semibold text-primary-700 hover:text-primary-800">
              View all
            </Link>
          </div>
          <CardContent className="p-6">
            {recentOrders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
                <div className="text-lg font-black text-gray-900">No orders yet</div>
                <div className="text-sm text-gray-500 mt-2">Place an order from the marketplace to see tracking here.</div>
                <Link href="/marketplace">
                  <Button className="mt-6">Start shopping</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-[980px] w-full text-sm">
                  <thead>
                    <tr className="text-xs font-bold uppercase tracking-widest text-gray-400">
                      <th className="text-left py-2 pr-4">Order</th>
                      <th className="text-left py-2 pr-4">Merchant</th>
                      <th className="text-left py-2 pr-4">Payment</th>
                      <th className="text-left py-2 pr-4">Tracking</th>
                      <th className="text-left py-2 pr-4">Status</th>
                      <th className="text-right py-2">Amount</th>
                      <th className="text-right py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/60">
                    {recentOrders.map((o) => {
                      const merchantName = getMerchantById(o.merchantId)?.businessName ?? o.merchantId;
                      const lastEvent = o.tracking?.events?.[o.tracking.events.length - 1];
                      const originalAmount = o.originalAmount ?? o.totalAmount ?? 0;
                      const originalCurrency = (o.originalCurrency ?? defaultCurrency()) as CurrencyCode;
                      const converted =
                        ratesUsd && originalCurrency !== displayCurrency
                          ? convertCurrency(originalAmount, originalCurrency, displayCurrency, ratesUsd).convertedAmount
                          : null;
                      return (
                        <tr key={o.id}>
                          <td className="py-3 pr-4">
                            <div className="font-black text-gray-900">{o.id}</div>
                            <div className="text-xs text-gray-500 mt-1">{new Date(o.createdAt).toLocaleDateString()}</div>
                          </td>
                          <td className="py-3 pr-4 text-gray-700">{merchantName}</td>
                          <td className="py-3 pr-4 text-gray-700">{o.paymentMethod}</td>
                          <td className="py-3 pr-4">
                            <div className="text-gray-700">{o.tracking?.trackingNumber ?? "Pending"}</div>
                            <div className="text-xs text-gray-500 mt-1">{lastEvent?.status ?? "—"}</div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${statusBadge(o.status)}`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="font-black text-gray-900">{formatCurrency(originalAmount, originalCurrency)}</div>
                            {converted !== null ? <div className="text-[11px] font-semibold text-gray-500 mt-1">≈ {formatCurrency(converted, displayCurrency)}</div> : null}
                          </td>
                          <td className="py-3 text-right">
                            <Link href={`/customer/orders/${o.id}`}>
                              <Button size="sm" variant="outline" className="whitespace-nowrap">
                                View details
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="p-6 border-b border-gray-100/60 flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-black text-gray-900">Order tracking</div>
                <div className="text-sm text-gray-500 mt-1">Latest active order progress.</div>
              </div>
              {trackingProgress?.order ? (
                <Link href={`/customer/orders/${trackingProgress.order.id}`}>
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </Link>
              ) : null}
            </div>
            <CardContent className="p-6">
              {!trackingProgress?.order ? (
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-600">No active orders to track.</div>
              ) : (
                <div>
                  <div className="text-sm font-black text-gray-900">{trackingProgress.order.id}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Tracking {trackingProgress.order.tracking?.trackingNumber ?? "Pending"} • {trackingProgress.order.tracking?.carrier ?? "MSquare Logistics"}
                  </div>
                  <div className="mt-4 space-y-2">
                    {trackingProgress.steps.map((s) => (
                      <div key={s.label} className="flex items-center gap-3">
                        <div
                          className={`w-3.5 h-3.5 rounded-full border ${
                            s.done ? "border-emerald-300 bg-emerald-500" : "border-gray-300 bg-white"
                          }`}
                        />
                        <div className={`text-sm font-semibold ${s.done ? "text-gray-900" : "text-gray-500"}`}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-700">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-black text-gray-900">Documents & invoices</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Invoices {docsSummary.invoices} • Proforma {docsSummary.proformas} • LC {docsSummary.lcDocs}
                  </div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Link href="/customer/invoices">
                  <Button variant="outline" className="w-full">
                    Invoices
                  </Button>
                </Link>
                <Link href="/customer/documents">
                  <Button variant="outline" className="w-full">
                    Documents
                  </Button>
                </Link>
              </div>
              <div className="mt-3 text-[11px] text-gray-500">Download links are mock and for demo only.</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-700">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-black text-gray-900">Saved addresses</div>
                  <div className="text-sm text-gray-500 mt-1">{addresses.length ? "Manage delivery addresses." : "No saved addresses yet."}</div>
                </div>
              </div>
              <Link href="/customer/addresses" className="mt-5 block">
                <Button variant="outline" className="w-full">
                  Manage addresses
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-black text-gray-900">Recommended products</div>
                  <div className="text-sm text-gray-500 mt-1">Based on your order categories (mock).</div>
                </div>
              </div>
              {recommendedProducts.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-600">No recommendations yet.</div>
              ) : (
                <div className="mt-5 space-y-2">
                  {recommendedProducts.map((p) => (
                    <Link
                      key={p.id}
                      href={`/products/${p.id}`}
                      className="block rounded-2xl border border-gray-200/60 bg-white px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-sm font-black text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {p.merchantName} • ${p.price.toFixed(2)}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-800">
                  <Gavel className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-black text-gray-900">Support</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Disputes {openDisputes} • Claims {openClaims} • Tickets {supportSummary.tickets}
                  </div>
                </div>
              </div>
              <Link href="/customer/support" className="mt-5 block">
                <Button variant="outline" className="w-full">
                  Open support center
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <div className="p-6 border-b border-gray-100/60 flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-black text-gray-900">Insights</div>
              <div className="text-sm text-gray-500 mt-1">Category spend, delivery performance, and LC status.</div>
            </div>
          </div>
          <CardContent className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MiniBarChart title="Category spending" data={categorySpending} />
            <div className="rounded-3xl border border-gray-200/60 bg-white p-6">
              <div className="text-sm font-black text-gray-900">Delivery performance</div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Delivered</div>
                  <div className="mt-1 text-xl font-black text-gray-900">{deliveryPerformance.total}</div>
                </div>
                <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-emerald-800/70">On-time</div>
                  <div className="mt-1 text-xl font-black text-emerald-900">{deliveryPerformance.onTime}</div>
                </div>
                <div className="rounded-2xl border border-red-200/70 bg-red-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-red-800/70">Late</div>
                  <div className="mt-1 text-xl font-black text-red-900">{deliveryPerformance.late}</div>
                </div>
              </div>
              <div className="mt-6 text-sm font-black text-gray-900">LC requests</div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Total</div>
                  <div className="mt-1 text-lg font-black text-gray-900">{lcStatusSummary.total}</div>
                </div>
                <div className="rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-amber-900/70">Under review</div>
                  <div className="mt-1 text-lg font-black text-amber-900">{lcStatusSummary.under}</div>
                </div>
                <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-emerald-900/70">Settled</div>
                  <div className="mt-1 text-lg font-black text-emerald-900">{lcStatusSummary.settled}</div>
                </div>
              </div>
              <div className="mt-5">
                <Link href="/customer/orders">
                  <Button variant="outline" className="w-full">
                    View orders & LC
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-700">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-black text-gray-900">Saved merchants</div>
                  <div className="text-sm text-gray-500 mt-1">{savedMerchants.length ? `${savedMerchants.length} saved` : "No saved merchants yet."}</div>
                </div>
              </div>
              {savedMerchants.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  Save suppliers to quickly contact them for RFQs.
                </div>
              ) : (
                <div className="mt-5 space-y-2">
                  {savedMerchants.slice(0, 3).map((id) => {
                    const m = getMerchantById(id);
                    return (
                      <div key={id} className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                        <div className="text-sm font-black text-gray-900">{m?.businessName ?? id}</div>
                        <div className="text-xs text-gray-500 mt-1">{m?.city ?? "Saudi Arabia"}</div>
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="outline" className="w-full" onClick={() => window.alert("Mock: contact supplier")}>
                            Contact
                          </Button>
                          <Button size="sm" className="w-full" onClick={() => window.alert("Mock: view store")}>
                            View store
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <Link href="/customer/saved-merchants" className="mt-5 block">
                <Button variant="outline" className="w-full">
                  Manage saved merchants
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </CustomerLayout>
  );
}
