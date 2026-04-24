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
import { type Order } from "@/types";
import { FileSearch, Package, ShieldCheck, ShoppingBag } from "lucide-react";

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
};

export default function MerchantDashboardPage() {
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    seedOrdersIfEmpty();
    const session = loadSession();
    if (!session || session.user.role !== "MERCHANT") return;
    setMerchantId(session.user.merchantParentId ?? session.user.id);
    setOrders(loadOrders());
  }, []);

  const merchant = useMemo(() => (merchantId ? getMerchantById(merchantId) : null), [merchantId]);

  const myOrders = useMemo(() => {
    if (!merchantId) return [];
    return orders.filter((o) => o.merchantId === merchantId);
  }, [merchantId, orders]);

  const myProducts = useMemo(() => {
    if (!merchantId) return [];
    return listProducts().filter((p) => p.merchantId === merchantId);
  }, [merchantId]);

  const totalOrders = myOrders.length;
  const totalSales = myOrders.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);
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
          { label: "Total sales", value: formatMoney(totalSales), icon: <ShieldCheck className="w-5 h-5" /> },
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
                        <div className="text-xs text-gray-500 mt-1">{o.items.length} items • {formatMoney(o.totalAmount)}</div>
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
        </div>
      </div>
    </MerchantLayout>
  );
}
