"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CustomerLayout } from "@/features/customer/CustomerLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { loadOrders } from "@/services/orderStore";
import { CheckCircle2, ShieldCheck, Truck } from "lucide-react";

export default function CustomerOrderConfirmationPage() {
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const sp = new URLSearchParams(window.location.search);
      const fromQuery = sp.get("orderId");
      const fromStore = window.localStorage.getItem("msquare.lastOrderId.v1");
      setOrderId((fromQuery ?? fromStore ?? "").trim() || null);
    } catch {
      setOrderId(null);
    }
  }, []);

  const order = useMemo(() => {
    if (!orderId) return null;
    return loadOrders().find((o) => o.id === orderId) ?? null;
  }, [orderId]);

  return (
    <CustomerLayout>
      <div className="max-w-3xl">
        <div className="rounded-3xl border border-green-200/70 bg-green-50 p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white border border-green-200/70 flex items-center justify-center text-green-700">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-green-900">Order confirmed</div>
            <div className="text-sm text-green-800 mt-1">
              {orderId ? (
                <>
                  Your order <span className="font-black">{orderId}</span> has been placed successfully.
                </>
              ) : (
                <>Your order has been placed successfully.</>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary-50 border border-primary-200/60 flex items-center justify-center text-primary-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-black text-gray-900">Trade Assurance</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Escrow holds funds until you confirm delivery. Disputes and insurance are available for eligible orders.
                  </div>
                </div>
              </div>

              {order?.shipping && (
                <div className="mt-6 rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Shipping</div>
                  <div className="mt-1 text-sm font-black text-gray-900">{order.shipping.methodName}</div>
                  <div className="text-xs text-gray-500 mt-1">ETA: {order.shipping.estimatedDays} days</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-700">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-black text-gray-900">Next steps</div>
                  <div className="text-sm text-gray-500 mt-1">Track shipment updates and download invoices from the order.</div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Link href={orderId ? `/customer/orders/${orderId}` : "/customer/orders"} className="block">
                  <Button className="w-full">Track my order</Button>
                </Link>
                <Link href="/customer/orders" className="block">
                  <Button variant="outline" className="w-full">
                    View all orders
                  </Button>
                </Link>
                <Link href="/marketplace" className="block">
                  <Button variant="outline" className="w-full">
                    Back to marketplace
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </CustomerLayout>
  );
}

