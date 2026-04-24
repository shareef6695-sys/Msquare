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
import { type Address, type Order } from "@/types";
import { Bell, MapPin, ShieldCheck, ShoppingBag, Truck } from "lucide-react";

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
};

export default function CustomerDashboardPage() {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);

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
    return orders.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);
  }, [orders]);

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
              <div className="text-xl font-black text-gray-900 mt-1">{formatMoney(totalSpent)}</div>
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
                            {o.items.length} items • {formatMoney(o.totalAmount)} • {o.shipping?.methodName ?? "Standard"}
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
