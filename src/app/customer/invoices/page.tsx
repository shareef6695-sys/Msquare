"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CustomerLayout } from "@/features/customer/CustomerLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { loadSession } from "@/services/authStore";
import { seedOrdersIfEmpty } from "@/services/orderStore";
import { type Order } from "@/types";
import { FileDown, FileText } from "lucide-react";

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

const downloadHtmlDocument = (input: { html: string; filename: string }) => {
  const blob = new Blob([input.html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = input.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default function CustomerInvoicesPage() {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const session = loadSession();
    if (!session || session.user.role !== "CUSTOMER") return;
    setCustomerId(session.user.id);
    setOrders(seedOrdersIfEmpty().filter((o) => o.customerId === session.user.id));
  }, []);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle ? orders.filter((o) => o.id.toLowerCase().includes(needle)) : orders;
    return filtered
      .filter((o) => Boolean(o.invoices?.orderInvoiceHtml) || Boolean(o.invoices?.proformaInvoiceHtml))
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [orders, q]);

  return (
    <CustomerLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Invoices</h1>
          <p className="text-gray-500">Download invoices, proformas, and LC-related invoice files (mock).</p>
        </div>
        <Link href="/customer/orders">
          <Button variant="outline">Open orders</Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-black text-gray-900">Search</div>
            <div className="text-sm text-gray-500 mt-1">Find invoices by order number.</div>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full md:w-[360px] rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="e.g., o_1234"
            disabled={!customerId}
          />
        </CardContent>
      </Card>

      <Card>
        <div className="p-6 border-b border-gray-100/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-black text-gray-900">Available invoices</div>
              <div className="text-xs text-gray-500 mt-1">{rows.length} items</div>
            </div>
          </div>
        </div>
        <CardContent className="p-6 space-y-4">
          {rows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
              <div className="text-lg font-black text-gray-900">No invoices found</div>
              <div className="text-sm text-gray-500 mt-2">Invoices appear after checkout in the mock flow.</div>
            </div>
          ) : (
            rows.map((o) => (
              <div key={o.id} className="rounded-3xl border border-gray-200/60 bg-white p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-gray-900">{o.id}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Generated {o.invoices?.generatedAt ? new Date(o.invoices.generatedAt).toLocaleString() : "—"} • Method {o.paymentMethod}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {o.invoices?.orderInvoiceHtml ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPrintableDocument({ html: o.invoices?.orderInvoiceHtml ?? "", title: `Invoice - ${o.id}` })}
                        >
                          <FileDown className="w-4 h-4 mr-2" />
                          Print invoice
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadHtmlDocument({ html: o.invoices?.orderInvoiceHtml ?? "", filename: `MSquare-Order-Invoice-${o.id}.html` })
                          }
                        >
                          Download
                        </Button>
                      </>
                    ) : null}
                    {o.invoices?.proformaInvoiceHtml ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPrintableDocument({ html: o.invoices?.proformaInvoiceHtml ?? "", title: `Proforma - ${o.id}` })}
                        >
                          <FileDown className="w-4 h-4 mr-2" />
                          Print proforma
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadHtmlDocument({ html: o.invoices?.proformaInvoiceHtml ?? "", filename: `MSquare-Proforma-Invoice-${o.id}.html` })
                          }
                        >
                          Download
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </CustomerLayout>
  );
}

