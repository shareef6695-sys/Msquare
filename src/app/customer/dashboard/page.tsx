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
import { Bell, MapPin, ShieldCheck, ShoppingBag, Truck } from "lucide-react";

const defaultCurrency = (): CurrencyCode => {
  const raw = (process.env.NEXT_PUBLIC_DEFAULT_CURRENCY as CurrencyCode | undefined) ?? "SAR";
  return SUPPORTED_CURRENCIES.includes(raw) ? raw : "SAR";
};

export default function CustomerDashboardPage() {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>(defaultCurrency());

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

  const recentOrders = useMemo(() => {
    return [...orders].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, 3);
  }, [orders]);

  const activeOrders = useMemo(() => {
    return orders.filter((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED").length;
  }, [orders]);

  const totalSpent = useMemo(() => {
    if (!ratesUsd) return orders.reduce((sum, o) => sum + (o.originalAmount ?? o.totalAmount ?? 0), 0);
    return orders.reduce((sum, o) => {
      const originalAmount = o.originalAmount ?? o.totalAmount ?? 0;
      const originalCurrency = (o.originalCurrency ?? defaultCurrency()) as CurrencyCode;
      return sum + convertCurrency(originalAmount, originalCurrency, displayCurrency, ratesUsd).convertedAmount;
    }, 0);
  }, [displayCurrency, orders, ratesUsd]);

  const unreadNotifications = useMemo(() => {
    const targets = [email, phone].filter(Boolean) as string[];
    return getUnreadCountForTargets(targets);
  }, [email, phone]);

  const cart = getResolvedCartItems();

  return (
    <CustomerLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Customer Dashboard</h1>
          <p className="text-gray-500">Recent orders, tracking, addresses, and notifications.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-700">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Active orders</div>
              <div className="text-xl font-black text-gray-900 mt-1">{activeOrders}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Total spent</div>
              <div className="text-xl font-black text-gray-900 mt-1">{formatCurrency(totalSpent, displayCurrency)}</div>
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
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-700">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Saved addresses</div>
              <div className="text-xl font-black text-gray-900 mt-1">{addresses.length}</div>
            </div>
          </CardContent>
        </Card>
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
              <div className="space-y-4">
                {recentOrders.map((o) => {
                  const lastEvent = o.tracking?.events?.[o.tracking.events.length - 1];
                  const originalAmount = o.originalAmount ?? o.totalAmount ?? 0;
                  const originalCurrency = (o.originalCurrency ?? defaultCurrency()) as CurrencyCode;
                  const converted =
                    ratesUsd && originalCurrency !== displayCurrency
                      ? convertCurrency(originalAmount, originalCurrency, displayCurrency, ratesUsd).convertedAmount
                      : null;
                  return (
                    <Link
                      key={o.id}
                      href={`/customer/orders/${o.id}`}
                      className="block rounded-3xl border border-gray-200/60 bg-white p-5 hover:shadow-sm transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-sm font-black text-gray-900">{o.id}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {o.items.length} items • {formatCurrency(originalAmount, originalCurrency)}
                            {converted !== null ? ` ≈ ${formatCurrency(converted, displayCurrency)}` : ""} •{" "}
                            {o.shipping?.methodName ?? "Standard"}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Tracking:{" "}
                            <span className="font-semibold text-gray-700">{o.tracking?.trackingNumber ?? "Pending"}</span>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Latest update</div>
                          <div className="text-sm font-black text-gray-900 mt-1">{lastEvent?.status ?? o.status}</div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
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

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-700">
                  <Truck className="w-5 h-5" />
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
        </div>
      </div>
    </CustomerLayout>
  );
}
