"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MerchantLayout } from "@/features/merchant/MerchantLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { loadSession } from "@/services/authStore";
import { getCustomerById } from "@/services/adminService";
import { loadOrders, seedOrdersIfEmpty } from "@/services/orderStore";
import { type Order } from "@/types";
import { Users } from "lucide-react";

export default function MerchantCustomersPage() {
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    setOrders(seedOrdersIfEmpty());
    const session = loadSession();
    if (!session || session.user.role !== "MERCHANT") return;
    setMerchantId(session.user.merchantParentId ?? session.user.id);
    setOrders(loadOrders());
  }, []);

  const customers = useMemo(() => {
    if (!merchantId) return [];
    const ids = Array.from(new Set(orders.filter((o) => o.merchantId === merchantId).map((o) => o.customerId).filter(Boolean))) as string[];
    return ids
      .map((id) => {
        const c = getCustomerById(id);
        return {
          id,
          name: c?.name ?? id,
          email: c?.email ?? "—",
          phone: c?.phone ?? "—",
          risk: c?.riskChecks?.riskLevel ?? "low",
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [merchantId, orders]);

  return (
    <MerchantLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight text-gray-900">Customers</h1>
        <p className="text-gray-500">Customers who placed orders with your store (mock).</p>
      </div>

      <Card>
        <div className="p-6 border-b border-gray-100/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-black text-gray-900">Customer list</div>
              <div className="text-xs text-gray-500 mt-1">{customers.length} total</div>
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          {customers.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
              <div className="text-lg font-black text-gray-900">No customers yet</div>
              <div className="text-sm text-gray-500 mt-2">Customers appear after they place orders.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {customers.map((c) => (
                <div key={c.id} className="rounded-3xl border border-gray-200/60 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-gray-900 truncate">{c.name}</div>
                    <div className="text-xs text-gray-500 mt-1 truncate">{c.email}</div>
                    <div className="text-xs text-gray-500 mt-1 truncate">{c.phone}</div>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-gray-200/70 bg-gray-50 px-3 py-1 text-xs font-black text-gray-700 whitespace-nowrap">
                    Risk {String(c.risk).toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </MerchantLayout>
  );
}

