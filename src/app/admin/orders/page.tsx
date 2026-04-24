"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { seedOrdersIfEmpty } from "@/services/orderStore";
import { Order } from "@/types";

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
};

const badgeClass = (status: Order["status"]) => {
  if (status === "DELIVERED") return "bg-green-50 text-green-700 border-green-200/70";
  if (status === "SHIPPED") return "bg-blue-50 text-blue-700 border-blue-200/70";
  if (status === "PROCESSING") return "bg-amber-50 text-amber-800 border-amber-200/70";
  if (status === "PAID") return "bg-indigo-50 text-indigo-700 border-indigo-200/70";
  if (status === "CANCELLED") return "bg-red-50 text-red-700 border-red-200/70";
  return "bg-gray-50 text-gray-700 border-gray-200/70";
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    setOrders(seedOrdersIfEmpty());
  }, []);

  const sorted = useMemo(() => {
    return [...orders].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [orders]);

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight text-gray-900">All orders</h1>
        <p className="text-gray-500">Audit orders across escrow, LC, card, and bank transfers.</p>
      </div>

      <div className="space-y-6">
        {sorted.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-sm text-gray-500">No orders found.</CardContent>
          </Card>
        ) : (
          sorted.map((order) => {
            const isEscrow = order.paymentType === "escrow" || order.paymentMethod === "ESCROW";
            const isLc = order.paymentType === "lc" || order.paymentMethod === "LC";

            return (
              <Card key={order.id} className="overflow-hidden">
                <div className="p-6 border-b border-gray-100/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-sm font-black text-gray-900">{order.id}</div>
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${badgeClass(order.status)}`}>
                        {order.status}
                      </span>
                      {order.tradeAssurance && (
                        <span className="inline-flex items-center rounded-full border border-primary-200/70 bg-primary-50 px-3 py-1 text-xs font-black text-primary-800">
                          Trade Assurance
                        </span>
                      )}
                      {order.insuranceEnabled && (
                        <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">
                          Insured
                        </span>
                      )}
                      {isEscrow && order.escrowStatus && (
                        <span className="inline-flex items-center rounded-full border border-primary-200/70 bg-primary-50 px-3 py-1 text-xs font-black text-primary-800">
                          Escrow {order.escrowStatus}
                        </span>
                      )}
                      {isLc && (
                        <span className="inline-flex items-center rounded-full border border-blue-200/70 bg-blue-50 px-3 py-1 text-xs font-black text-blue-800">
                          LC {order.lcStatus ?? "DRAFT"}
                        </span>
                      )}
                      {order.disputeStatus && order.disputeStatus !== "NONE" && (
                        <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                          Dispute {order.disputeStatus}
                        </span>
                      )}
                      {order.insuranceClaimStatus && order.insuranceClaimStatus !== "NONE" && (
                        <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                          Claim {order.insuranceClaimStatus}
                        </span>
                      )}
                      {(order.totalAmount ?? 0) >= 50000 && (
                        <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-xs font-black text-amber-900">
                          Large order
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Buyer {order.customerId} • Merchant {order.merchantId} • Method{" "}
                      <span className="font-semibold text-gray-700">{order.paymentMethod}</span>
                      {order.paymentType && (
                        <>
                          {" "}
                          • Type <span className="font-semibold text-gray-700">{order.paymentType}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-gray-500">Order total</div>
                    <div className="text-base font-black text-gray-900">{formatMoney(order.totalAmount)}</div>
                  </div>
                </div>

                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <div className="text-sm font-black text-gray-900 mb-3">Items</div>
                      <div className="space-y-3">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3 flex items-center justify-between gap-4"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">{item.productName}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                Qty {item.quantity} • {formatMoney(item.price)}
                              </div>
                            </div>
                            <div className="text-sm font-black text-gray-900">{formatMoney(item.price * item.quantity)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-3xl border border-gray-200/60 bg-gray-50 p-5">
                      <div className="text-sm font-black text-gray-900 mb-4">Protection summary</div>
                      <div className="space-y-3 text-sm text-gray-700">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Trade assurance</span>
                          <span className="font-semibold">{order.tradeAssurance ? "Enabled" : "No"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Insurance</span>
                          <span className="font-semibold">{order.insuranceEnabled ? "Enabled" : "No"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Dispute</span>
                          <span className="font-semibold">{order.disputeStatus ?? "NONE"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Claim</span>
                          <span className="font-semibold">{order.insuranceClaimStatus ?? "NONE"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </AdminLayout>
  );
}
