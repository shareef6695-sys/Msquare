"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MerchantLayout } from "@/features/merchant/MerchantLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { loadSession } from "@/services/authStore";
import { getMerchantById } from "@/services/adminService";
import { loadOrders, seedOrdersIfEmpty } from "@/services/orderStore";
import { listProducts } from "@/services/productService";
import { useExchangeRatesUsd } from "@/services/exchangeRateService";
import { SUPPORTED_CURRENCIES, convertCurrency, formatCurrency } from "@/utils/currencyConverter";
import { type CurrencyCode, type Order } from "@/types";
import { AIAssistantWidget } from "@/components/ai/AIAssistantWidget";
import { FileSearch, Package, Search, ShieldCheck, ShoppingBag } from "lucide-react";

const defaultCurrency = (): CurrencyCode => {
  const raw = (process.env.NEXT_PUBLIC_DEFAULT_CURRENCY as CurrencyCode | undefined) ?? "SAR";
  return SUPPORTED_CURRENCIES.includes(raw) ? raw : "SAR";
};

const statusBadge = (status: string) => {
  const s = status.toUpperCase();
  if (s === "DELIVERED" || s === "COMPLETED" || s === "RELEASED") return "border-emerald-200/70 bg-emerald-50 text-emerald-800";
  if (s === "SHIPPED") return "border-blue-200/70 bg-blue-50 text-blue-800";
  if (s === "PROCESSING" || s === "PAID") return "border-amber-200/70 bg-amber-50 text-amber-800";
  if (s === "CANCELLED" || s === "FAILED" || s === "REJECTED") return "border-red-200/70 bg-red-50 text-red-700";
  return "border-gray-200/70 bg-gray-50 text-gray-700";
};

export default function MerchantDashboardPage() {
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>(defaultCurrency());
  const [orderQuery, setOrderQuery] = useState("");
  const { loading: ratesLoading, result: ratesResult } = useExchangeRatesUsd();
  const ratesUsd = ratesResult?.ratesUsd;

  useEffect(() => {
    seedOrdersIfEmpty();
    const session = loadSession();
    if (!session || session.user.role !== "MERCHANT") return;
    const id = session.user.merchantParentId ?? session.user.id;
    setMerchantId(id);
    setOrders(loadOrders());
  }, []);

  const merchant = useMemo(() => (merchantId ? getMerchantById(merchantId) : null), [merchantId]);

  useEffect(() => {
    if (!merchantId || typeof window === "undefined") return;
    const key = `msquare.currency.merchant.${merchantId}.v1`;
    const raw = window.localStorage.getItem(key);
    if (raw && SUPPORTED_CURRENCIES.includes(raw as CurrencyCode)) {
      setDisplayCurrency(raw as CurrencyCode);
      return;
    }
    const initial = (merchant?.sellingCurrency ?? defaultCurrency()) as CurrencyCode;
    setDisplayCurrency(initial);
  }, [merchant, merchantId]);

  useEffect(() => {
    if (!merchantId || typeof window === "undefined") return;
    const key = `msquare.currency.merchant.${merchantId}.v1`;
    window.localStorage.setItem(key, displayCurrency);
  }, [displayCurrency, merchantId]);

  const myOrders = useMemo(() => {
    if (!merchantId) return [];
    return orders.filter((o) => o.merchantId === merchantId);
  }, [merchantId, orders]);

  const myProducts = useMemo(() => {
    if (!merchantId) return [];
    return listProducts().filter((p) => p.merchantId === merchantId);
  }, [merchantId]);

  const totalOrders = myOrders.length;
  const totalSales = useMemo(() => {
    if (!ratesUsd) return myOrders.reduce((sum, o) => sum + (o.originalAmount ?? o.totalAmount ?? 0), 0);
    return myOrders.reduce((sum, o) => {
      const originalAmount = o.originalAmount ?? o.totalAmount ?? 0;
      const originalCurrency = (o.originalCurrency ?? merchant?.sellingCurrency ?? defaultCurrency()) as CurrencyCode;
      return sum + convertCurrency(originalAmount, originalCurrency, displayCurrency, ratesUsd).convertedAmount;
    }, 0);
  }, [displayCurrency, merchant?.sellingCurrency, myOrders, ratesUsd]);
  const pendingOrders = myOrders.filter((o) => o.status === "PROCESSING" || o.status === "PAID").length;
  const lcRequests = myOrders.filter((o) => o.paymentMethod === "LC" || o.paymentType === "lc").length;
  const recentOrders = [...myOrders].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, 5);
  const filteredRecentOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    if (!q) return recentOrders;
    return recentOrders.filter((o) => o.id.toLowerCase().includes(q));
  }, [orderQuery, recentOrders]);

  return (
    <MerchantLayout>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">Merchant Dashboard</h1>
            <p className="text-gray-500">Sales, orders, and products (mock).</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm shadow-gray-900/5">
              <div className="text-[11px] font-black uppercase tracking-widest text-gray-400">Currency</div>
              <select
                value={displayCurrency}
                onChange={(e) => setDisplayCurrency(e.target.value as CurrencyCode)}
                className="mt-1 w-full bg-transparent text-sm font-black text-gray-900 focus:outline-none"
                disabled={!merchantId}
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <Link href="/merchant/products/new">
              <Button>Add product</Button>
            </Link>
            <Link href="/merchant/orders">
              <Button variant="outline">View orders</Button>
            </Link>
          </div>
        </div>

        <div className="col-span-12 grid grid-cols-12 gap-6">
          {[
            {
              label: "Total sales",
              value: formatCurrency(totalSales, displayCurrency),
              icon: <ShieldCheck className="w-5 h-5" />,
              tone: "bg-primary-50 border-primary-200/60 text-primary-700",
            },
            {
              label: "Total orders",
              value: String(totalOrders),
              icon: <ShoppingBag className="w-5 h-5" />,
              tone: "bg-blue-50 border-blue-200/60 text-blue-700",
            },
            {
              label: "Active products",
              value: String(myProducts.length),
              icon: <Package className="w-5 h-5" />,
              tone: "bg-emerald-50 border-emerald-200/60 text-emerald-700",
            },
            {
              label: "Pending orders",
              value: String(pendingOrders),
              icon: <ShoppingBag className="w-5 h-5" />,
              tone: "bg-amber-50 border-amber-200/60 text-amber-800",
            },
          ].map((s) => (
            <Card key={s.label} className="col-span-12 sm:col-span-6 lg:col-span-3">
              <CardContent className="p-6 flex items-start gap-4">
                <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${s.tone}`}>{s.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{s.label}</div>
                  <div className="text-xl font-black text-gray-900 mt-1 truncate">{s.value}</div>
                  {s.label === "Total sales" && (
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
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="col-span-12 lg:col-span-8 overflow-hidden">
          <div className="p-6 border-b border-gray-100/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-lg font-black text-gray-900">Recent orders</div>
              <div className="text-sm text-gray-500 mt-1">Latest activity for your storefront.</div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={orderQuery}
                  onChange={(e) => setOrderQuery(e.target.value)}
                  placeholder="Search by order ID"
                  className="w-full sm:w-64 pl-10 pr-3 py-2.5 rounded-xl border border-gray-200/60 bg-gray-50 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <Link href="/merchant/orders">
                <Button variant="outline" className="w-full sm:w-auto">
                  View all
                </Button>
              </Link>
            </div>
          </div>
          <CardContent className="p-0">
            {filteredRecentOrders.length === 0 ? (
              <div className="p-8">
                <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
                  <div className="text-lg font-black text-gray-900">No orders found</div>
                  <div className="text-sm text-gray-500 mt-2">Try a different search term or view all orders.</div>
                </div>
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-[820px] w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-xs font-black uppercase tracking-widest text-gray-400">
                      <th className="text-left py-3 px-6">Order</th>
                      <th className="text-left py-3 px-6">Items</th>
                      <th className="text-left py-3 px-6">Status</th>
                      <th className="text-right py-3 px-6">Amount</th>
                      <th className="text-right py-3 px-6">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/60">
                    {filteredRecentOrders.map((o) => {
                      const originalAmount = o.originalAmount ?? o.totalAmount ?? 0;
                      const originalCurrency = (o.originalCurrency ?? merchant?.sellingCurrency ?? defaultCurrency()) as CurrencyCode;
                      const converted =
                        ratesUsd && originalCurrency !== displayCurrency
                          ? convertCurrency(originalAmount, originalCurrency, displayCurrency, ratesUsd).convertedAmount
                          : null;
                      return (
                        <tr key={o.id} className="hover:bg-gray-50/60">
                          <td className="py-4 px-6">
                            <div className="font-black text-gray-900">{o.id}</div>
                            <div className="text-xs font-semibold text-gray-500 mt-1">{new Date(o.createdAt).toLocaleDateString()}</div>
                          </td>
                          <td className="py-4 px-6 text-gray-700">{o.items.length}</td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${statusBadge(o.status)}`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="font-black text-gray-900">{formatCurrency(originalAmount, originalCurrency)}</div>
                            {converted !== null ? (
                              <div className="text-[11px] font-semibold text-gray-500 mt-1">≈ {formatCurrency(converted, displayCurrency)}</div>
                            ) : null}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <Link href={`/merchant/orders/${o.id}`}>
                              <Button size="sm" variant="outline" className="whitespace-nowrap">
                                View
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

        <div className="col-span-12 lg:col-span-4 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-700">
                  <FileSearch className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-black text-gray-900">LC requests</div>
                  <div className="text-sm text-gray-500 mt-1">{lcRequests} orders</div>
                </div>
              </div>
              <Link href="/merchant/lc-requests" className="mt-5 block">
                <Button variant="outline" className="w-full">
                  View LC requests
                </Button>
              </Link>
            </CardContent>
          </Card>

          <AIAssistantWidget />
        </div>
      </div>
    </MerchantLayout>
  );
}
