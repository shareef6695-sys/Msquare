"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/features/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { seedOrdersIfEmpty } from "@/services/orderStore";
import { Order } from "@/types";
import { Banknote, ShieldCheck } from "lucide-react";

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
};

export default function AdminPaymentsPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    setOrders(seedOrdersIfEmpty());
  }, []);

  const metrics = useMemo(() => {
    const volume = orders.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);
    const escrowHeld = orders.filter((o) => o.escrowStatus === "HELD").reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);
    const escrowReleased = orders.filter((o) => o.escrowStatus === "RELEASED").reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);
    const byType = orders.reduce<Record<string, number>>((acc, o) => {
      const t = o.paymentType ?? "unknown";
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    }, {});
    return { volume, escrowHeld, escrowReleased, byType };
  }, [orders]);

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight text-gray-900">Payments</h1>
        <p className="text-gray-500">Track volume, escrow holds/releases, and payment types.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: "Total volume", value: formatMoney(metrics.volume) },
          { label: "Escrow held", value: formatMoney(metrics.escrowHeld) },
          { label: "Escrow released", value: formatMoney(metrics.escrowReleased) },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">{stat.label}</div>
              <div className="text-2xl font-black text-gray-900 mt-2">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <div className="p-6 border-b border-gray-100/60">
            <h3 className="text-lg font-black text-gray-900">Recent payments</h3>
          </div>
          <CardContent className="p-6 space-y-4">
            {orders.slice(0, 8).map((o) => (
              <div key={o.id} className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-black text-gray-900">{o.id}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Method <span className="font-semibold text-gray-700">{o.paymentMethod}</span>{" "}
                    {o.paymentType && (
                      <>
                        • Type <span className="font-semibold text-gray-700">{o.paymentType}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Amount</div>
                  <div className="text-sm font-black text-gray-900">{formatMoney(o.totalAmount)}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <div className="p-6 border-b border-gray-100/60">
            <h3 className="text-lg font-black text-gray-900">By payment type</h3>
          </div>
          <CardContent className="p-6 space-y-3">
            {Object.entries(metrics.byType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  {type === "escrow" ? <ShieldCheck className="w-4 h-4 text-primary-700" /> : <Banknote className="w-4 h-4 text-gray-500" />}
                  {type}
                </div>
                <div className="text-sm font-black text-gray-900">{count}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

