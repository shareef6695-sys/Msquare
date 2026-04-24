"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { seedOrdersIfEmpty } from "@/services/orderStore";
import { Order } from "@/types";
import { AlertCircle, Gavel, ShieldCheck } from "lucide-react";

type DisputeRecord = Record<string, { status: string; reason: string; description: string }>;

export default function AdminDisputesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [disputes, setDisputes] = useState<DisputeRecord>({});

  useEffect(() => {
    setOrders(seedOrdersIfEmpty());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("msquare.disputes.v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as DisputeRecord;
      if (parsed && typeof parsed === "object") setDisputes(parsed);
    } catch {}
  }, []);

  const items = useMemo(() => {
    return Object.entries(disputes)
      .map(([orderId, d]) => {
        const order = orders.find((o) => o.id === orderId);
        return { orderId, ...d, order };
      })
      .sort((a, b) => b.orderId.localeCompare(a.orderId));
  }, [disputes, orders]);

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight text-gray-900">Disputes</h1>
        <p className="text-gray-500">Review disputes submitted by buyers and track admin decisions.</p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center mx-auto text-gray-400">
              <Gavel className="w-7 h-7" />
            </div>
            <div className="mt-5 text-lg font-black text-gray-900">No disputes yet</div>
            <p className="mt-2 text-sm text-gray-500">Disputes created from customer orders will show up here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {items.map((d) => (
            <Card key={d.orderId} className="overflow-hidden">
              <div className="p-6 border-b border-gray-100/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-sm font-black text-gray-900">{d.orderId}</div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {d.status}
                    </span>
                    {d.order?.tradeAssurance && (
                      <span className="inline-flex items-center rounded-full border border-primary-200/70 bg-primary-50 px-3 py-1 text-xs font-black text-primary-800">
                        Trade Assurance
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Reason <span className="font-semibold text-gray-700">{d.reason}</span>
                    {d.order && (
                      <>
                        {" "}
                        • Buyer <span className="font-semibold text-gray-700">{d.order.customerId}</span> • Merchant{" "}
                        <span className="font-semibold text-gray-700">{d.order.merchantId}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-gray-200/60 bg-white px-3 py-1.5 text-xs font-bold text-gray-700">
                  <ShieldCheck className="w-4 h-4 text-primary-700" />
                  Admin review
                </div>
              </div>
              <CardContent className="p-6">
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap">
                  {d.description || "No description provided."}
                </div>
                <div className="mt-4 text-[11px] font-bold uppercase tracking-widest text-gray-400">UI only</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
