"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MerchantLayout } from "@/features/merchant/MerchantLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { loadSession } from "@/services/authStore";
import { loadOrders, seedOrdersIfEmpty } from "@/services/orderStore";
import { type Order } from "@/types";
import { FileDown, FileSearch } from "lucide-react";

const openPrintableDocument = (input: { html: string; title: string }) => {
  const w = window.open("", "_blank", "noopener,noreferrer,width=980,height=720");
  if (!w) return;
  w.document.open();
  w.document.write(input.html);
  w.document.close();
  w.document.title = input.title;
  window.setTimeout(() => {
    w.focus();
    w.print();
  }, 250);
};

export default function MerchantLcRequestsPage() {
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    setOrders(seedOrdersIfEmpty());
    const session = loadSession();
    if (!session || session.user.role !== "MERCHANT") return;
    setMerchantId(session.user.merchantParentId ?? session.user.id);
    setOrders(loadOrders());
  }, []);

  const lcOrders = useMemo(() => {
    const mine = merchantId ? orders.filter((o) => o.merchantId === merchantId) : [];
    return mine
      .filter((o) => o.paymentMethod === "LC" || o.paymentType === "lc")
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [merchantId, orders]);

  const badgeClass = (status: string | undefined) => {
    const v = String(status ?? "").toUpperCase();
    if (v === "APPROVED") return "bg-green-50 text-green-700 border-green-200/70";
    if (v === "REJECTED") return "bg-red-50 text-red-700 border-red-200/70";
    if (v === "SETTLED") return "bg-indigo-50 text-indigo-700 border-indigo-200/70";
    return "bg-amber-50 text-amber-800 border-amber-200/70";
  };

  return (
    <MerchantLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">LC Requests</h1>
          <p className="text-gray-500">LC orders and bank status updates (mock).</p>
        </div>
        <Link href="/merchant/trade-finance">
          <Button variant="outline">Trade finance</Button>
        </Link>
      </div>

      <Card>
        <div className="p-6 border-b border-gray-100/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-700">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-black text-gray-900">LC orders</div>
              <div className="text-xs text-gray-500 mt-1">{lcOrders.length} total</div>
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          {lcOrders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
              <div className="text-lg font-black text-gray-900">No LC requests</div>
              <div className="text-sm text-gray-500 mt-2">LC orders appear when customers choose LC at checkout.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {lcOrders.map((o) => (
                <div key={o.id} className="rounded-3xl border border-gray-200/60 bg-white p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <Link href={`/merchant/orders/${o.id}`} className="text-sm font-black text-gray-900 hover:text-primary-700">
                        {o.id}
                      </Link>
                      <div className="text-xs text-gray-500 mt-1">{o.createdAt} • {o.items.length} items</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${badgeClass(o.lcStatus)}`}>
                        {String(o.lcStatus ?? "UNDER_REVIEW").replaceAll("_", " ")}
                      </span>
                      {o.invoices?.proformaInvoiceHtml && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPrintableDocument({ html: o.invoices?.proformaInvoiceHtml ?? "", title: `Proforma Invoice - ${o.id}` })}
                        >
                          <FileDown className="w-4 h-4 mr-2" />
                          Proforma
                        </Button>
                      )}
                      <Link href={`/merchant/orders/${o.id}`}>
                        <Button variant="outline" size="sm">
                          View order
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </MerchantLayout>
  );
}

