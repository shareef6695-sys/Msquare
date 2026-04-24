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
import { FileSearch, Package, ShieldCheck, ShoppingBag } from "lucide-react";

const defaultCurrency = (): CurrencyCode => {
  const raw = (process.env.NEXT_PUBLIC_DEFAULT_CURRENCY as CurrencyCode | undefined) ?? "SAR";
  return SUPPORTED_CURRENCIES.includes(raw) ? raw : "SAR";
};

export default function MerchantDashboardPage() {
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>(defaultCurrency());
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

  return (
    <MerchantLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Merchant Dashboard</h1>
          <p className="text-gray-500">Sales, orders, products, and compliance (mock).</p>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Total sales", value: formatCurrency(totalSales, displayCurrency), icon: <ShieldCheck className="w-5 h-5" /> },
          { label: "Total orders", value: String(totalOrders), icon: <ShoppingBag className="w-5 h-5" /> },
          { label: "Active products", value: String(myProducts.length), icon: <Package className="w-5 h-5" /> },
          { label: "Pending orders", value: String(pendingOrders), icon: <ShoppingBag className="w-5 h-5" /> },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-700">
                {s.icon}
              </div>
              <div className="min-w-0">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <div className="p-6 border-b border-gray-100/60 flex items-center justify-between">
            <div className="text-lg font-black text-gray-900">Recent orders</div>
            <Link href="/merchant/orders" className="text-sm font-semibold text-primary-700 hover:text-primary-800">
              View all
            </Link>
          </div>
          <CardContent className="p-6">
            {recentOrders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
                <div className="text-lg font-black text-gray-900">No orders yet</div>
                <div className="text-sm text-gray-500 mt-2">Orders will appear after customers checkout.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/merchant/orders/${o.id}`}
                    className="block rounded-3xl border border-gray-200/60 bg-white p-5 hover:shadow-sm transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-black text-gray-900">{o.id}</div>
                        {(() => {
                          const originalAmount = o.originalAmount ?? o.totalAmount ?? 0;
                          const originalCurrency = (o.originalCurrency ?? merchant?.sellingCurrency ?? defaultCurrency()) as CurrencyCode;
                          const converted =
                            ratesUsd && originalCurrency !== displayCurrency
                              ? convertCurrency(originalAmount, originalCurrency, displayCurrency, ratesUsd).convertedAmount
                              : null;
                          return (
                            <div className="text-xs text-gray-500 mt-1">
                              {o.items.length} items • {formatCurrency(originalAmount, originalCurrency)}
                              {converted !== null ? ` ≈ ${formatCurrency(converted, displayCurrency)}` : ""}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Status</div>
                        <div className="text-sm font-black text-gray-900 mt-1">{o.status}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
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
                  <div className="text-lg font-black text-gray-900">Compliance status</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {merchant ? `${merchant.complianceBadge ?? "Good"} (${merchant.complianceScore ?? 100})` : "Loading…"}
                  </div>
                </div>
              </div>
              <Link href="/merchant/compliance" className="mt-5 block">
                <Button variant="outline" className="w-full">
                  Open compliance
                </Button>
              </Link>
            </CardContent>
          </Card>

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
