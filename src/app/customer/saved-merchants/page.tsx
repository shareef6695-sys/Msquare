"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CustomerLayout } from "@/features/customer/CustomerLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { loadSession } from "@/services/authStore";
import { seedOrdersIfEmpty } from "@/services/orderStore";
import { getMerchantById } from "@/services/adminService";
import { type Order } from "@/types";
import { Bookmark, Store } from "lucide-react";

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export default function CustomerSavedMerchantsPage() {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    const session = loadSession();
    if (!session || session.user.role !== "CUSTOMER") return;
    setCustomerId(session.user.id);
    setOrders(seedOrdersIfEmpty().filter((o) => o.customerId === session.user.id));
  }, []);

  useEffect(() => {
    if (!customerId || typeof window === "undefined") return;
    const key = `msquare.customer.savedMerchants.${customerId}.v1`;
    const list = safeJsonParse<string[]>(window.localStorage.getItem(key), []);
    if (list.length > 0) {
      setSaved(list);
      return;
    }
    const inferred = Array.from(new Set(orders.map((o) => o.merchantId))).slice(0, 6);
    window.localStorage.setItem(key, JSON.stringify(inferred));
    setSaved(inferred);
  }, [customerId, orders]);

  useEffect(() => {
    if (!customerId || typeof window === "undefined") return;
    const key = `msquare.customer.savedMerchants.${customerId}.v1`;
    window.localStorage.setItem(key, JSON.stringify(saved));
  }, [customerId, saved]);

  const inferredMerchants = useMemo(() => Array.from(new Set(orders.map((o) => o.merchantId))).filter((id) => !saved.includes(id)), [orders, saved]);

  return (
    <CustomerLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Saved merchants</h1>
          <p className="text-gray-500">Favorite suppliers for quick contact and repeat ordering (mock).</p>
        </div>
        <Link href="/marketplace">
          <Button variant="outline">Browse marketplace</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <div className="p-6 border-b border-gray-100/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 border border-primary-200/60 flex items-center justify-center text-primary-700">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-black text-gray-900">Saved suppliers</div>
              <div className="text-xs text-gray-500 mt-1">{saved.length} saved</div>
            </div>
          </div>
          <CardContent className="p-6 space-y-4">
            {saved.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
                <div className="text-lg font-black text-gray-900">No saved merchants</div>
                <div className="text-sm text-gray-500 mt-2">Save suppliers after placing orders (mock).</div>
              </div>
            ) : (
              saved.map((id) => {
                const m = getMerchantById(id);
                return (
                  <div key={id} className="rounded-3xl border border-gray-200/60 bg-white p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-700">
                            <Store className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-black text-gray-900 truncate">{m?.businessName ?? id}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {m?.city ?? "Saudi Arabia"} • {m?.email ?? "merchant@msquare.demo"}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => window.alert("Mock: contact supplier")}>
                          Contact supplier
                        </Button>
                        <Button size="sm" onClick={() => window.alert("Mock: view store")}>
                          View store
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setSaved((s) => s.filter((x) => x !== id))}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="p-6 border-b border-gray-100/60">
              <div className="text-lg font-black text-gray-900">Suggested suppliers</div>
              <div className="text-sm text-gray-500 mt-1">Based on your recent orders (mock).</div>
            </div>
            <CardContent className="p-6 space-y-3">
              {inferredMerchants.length === 0 ? (
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-600">No suggestions available.</div>
              ) : (
                inferredMerchants.slice(0, 6).map((id) => {
                  const m = getMerchantById(id);
                  return (
                    <div key={id} className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                      <div className="text-sm font-black text-gray-900">{m?.businessName ?? id}</div>
                      <div className="text-xs text-gray-500 mt-1">{m?.city ?? "Saudi Arabia"}</div>
                      <div className="mt-3">
                        <Button size="sm" className="w-full" onClick={() => setSaved((s) => (s.includes(id) ? s : [id, ...s]))}>
                          Save merchant
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-sm font-black text-gray-900">Tip</div>
              <div className="text-sm text-gray-600 mt-2">
                Use saved merchants to request quotes quickly and track supplier performance across orders.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </CustomerLayout>
  );
}

