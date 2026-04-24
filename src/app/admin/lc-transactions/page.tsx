"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/features/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { seedOrdersIfEmpty } from "@/services/orderStore";
import { Order } from "@/types";
import { FileText, ShieldCheck } from "lucide-react";

type LcUiState = Record<string, { uploaded: boolean; status: string; lastAction?: string; fileName?: string; invoiceUrl?: string }>;

export default function AdminLcTransactionsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [lcState, setLcState] = useState<LcUiState>({});

  useEffect(() => {
    setOrders(seedOrdersIfEmpty());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("msquare.lcState.v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as LcUiState;
      if (parsed && typeof parsed === "object") setLcState(parsed);
    } catch {}
  }, []);

  const lcOrders = useMemo(() => {
    return orders
      .filter((o) => o.paymentType === "lc" || o.paymentMethod === "LC")
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [orders]);

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight text-gray-900">LC transactions</h1>
        <p className="text-gray-500">Track LC requests, documents, and bank status per order.</p>
      </div>

      {lcOrders.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-gray-500">No LC orders found.</CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {lcOrders.map((order) => {
            const ui = lcState[order.id];
            const status = order.lcStatus ?? ui?.status ?? "DRAFT";

            return (
              <Card key={order.id} className="overflow-hidden">
                <div className="p-6 border-b border-gray-100/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-sm font-black text-gray-900">{order.id}</div>
                      <span className="inline-flex items-center rounded-full border border-blue-200/70 bg-blue-50 px-3 py-1 text-xs font-black text-blue-800">
                        LC {status}
                      </span>
                      {order.tradeAssurance && (
                        <span className="inline-flex items-center rounded-full border border-primary-200/70 bg-primary-50 px-3 py-1 text-xs font-black text-primary-800">
                          Trade Assurance
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Buyer <span className="font-semibold text-gray-700">{order.customerId}</span> • Merchant{" "}
                      <span className="font-semibold text-gray-700">{order.merchantId}</span>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-gray-200/60 bg-white px-3 py-1.5 text-xs font-bold text-gray-700">
                    <ShieldCheck className="w-4 h-4 text-primary-700" />
                    Bank workflow
                  </div>
                </div>

                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <div className="text-sm font-black text-gray-900 mb-3">Documents</div>
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">Uploaded file</div>
                          <div className="text-xs text-gray-500 mt-1">{ui?.fileName ?? "None"}</div>
                        </div>
                        <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">Invoice</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {ui?.invoiceUrl ? (
                              <a
                                href={ui.invoiceUrl}
                                className="text-primary-700 font-semibold hover:underline"
                                target="_blank"
                                rel="noreferrer"
                              >
                                {ui.invoiceUrl}
                              </a>
                            ) : (
                              "Not available"
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-gray-200/60 bg-gray-50 p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white border border-gray-200/60 flex items-center justify-center text-gray-600">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-black text-gray-900">LC status</div>
                          <div className="text-sm font-semibold text-gray-800 mt-1">{status}</div>
                          {ui?.lastAction && <div className="text-xs text-gray-500 mt-1">Last action: {ui.lastAction}</div>}
                        </div>
                      </div>
                      <div className="mt-4 text-[11px] font-bold uppercase tracking-widest text-gray-400">UI only</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}

