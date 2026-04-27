"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CustomerLayout } from "@/features/customer/CustomerLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { loadSession } from "@/services/authStore";
import { seedOrdersIfEmpty } from "@/services/orderStore";
import { type Order } from "@/types";
import { FileDown, FileSearch, FileText, ShieldCheck } from "lucide-react";

type LcUiState = Record<
  string,
  {
    uploaded: boolean;
    status: string;
    lastAction?: string;
    fileName?: string;
    invoiceUrl?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    shipmentDate?: string;
    certificateText?: string;
    insuranceCoveragePercent?: number;
  }
>;
type ClaimState = Record<string, { status: string; amount: string; description: string }>;

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export default function CustomerDocumentsPage() {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [lcState, setLcState] = useState<LcUiState>({});
  const [claims, setClaims] = useState<ClaimState>({});
  const [tab, setTab] = useState<"lc" | "insurance" | "invoices">("lc");

  useEffect(() => {
    const session = loadSession();
    if (!session || session.user.role !== "CUSTOMER") return;
    setCustomerId(session.user.id);
    setOrders(seedOrdersIfEmpty().filter((o) => o.customerId === session.user.id));
    if (typeof window !== "undefined") {
      setLcState(safeJsonParse<LcUiState>(window.localStorage.getItem("msquare.lcState.v1"), {}));
      setClaims(safeJsonParse<ClaimState>(window.localStorage.getItem("msquare.insuranceClaims.v1"), {}));
    }
  }, []);

  const lcOrders = useMemo(() => orders.filter((o) => o.paymentType === "lc" || o.paymentMethod === "LC"), [orders]);

  const lcDocs = useMemo(() => {
    return lcOrders
      .map((o) => {
        const ui = lcState[o.id];
        if (!ui?.fileName && !ui?.invoiceUrl) return null;
        return {
          orderId: o.id,
          status: (o.lcStatus ?? ui.status ?? "DRAFT").toString(),
          fileName: ui.fileName ?? null,
          invoiceUrl: ui.invoiceUrl ?? null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [lcOrders, lcState]);

  const insuranceDocs = useMemo(() => {
    const orderIds = new Set(orders.map((o) => o.id));
    return Object.entries(claims)
      .filter(([orderId]) => orderIds.has(orderId))
      .map(([orderId, c]) => ({ orderId, ...c }));
  }, [claims, orders]);

  const invoiceDocs = useMemo(() => {
    return orders
      .filter((o) => Boolean(o.invoices?.orderInvoiceHtml) || Boolean(o.invoices?.proformaInvoiceHtml))
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [orders]);

  return (
    <CustomerLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Documents</h1>
          <p className="text-gray-500">LC, insurance, and invoice-related files (mock).</p>
        </div>
        <div className="flex gap-2">
          <Link href="/customer/invoices">
            <Button variant="outline">Invoices</Button>
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { key: "lc" as const, label: `LC documents (${lcDocs.length})`, icon: <ShieldCheck className="w-4 h-4" /> },
          { key: "insurance" as const, label: `Insurance (${insuranceDocs.length})`, icon: <FileText className="w-4 h-4" /> },
          { key: "invoices" as const, label: `Invoice files (${invoiceDocs.length})`, icon: <FileDown className="w-4 h-4" /> },
        ].map((t) => (
          <button
            key={t.key}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.key ? "border-primary-200/70 bg-primary-50 text-primary-800" : "border-gray-200/60 bg-white text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => setTab(t.key)}
            disabled={!customerId}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "lc" && (
        <Card>
          <div className="p-6 border-b border-gray-100/60">
            <div className="text-lg font-black text-gray-900">LC documents</div>
            <div className="text-sm text-gray-500 mt-1">Uploaded LC file names and invoice links (mock).</div>
          </div>
          <CardContent className="p-6 space-y-3">
            {lcDocs.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
                <div className="text-lg font-black text-gray-900">No LC documents</div>
                <div className="text-sm text-gray-500 mt-2">LC docs appear after you upload them in the LC flow.</div>
              </div>
            ) : (
              lcDocs.map((d) => (
                <div key={d.orderId} className="rounded-3xl border border-gray-200/60 bg-white p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-gray-900">Order {d.orderId}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Status <span className="font-semibold text-gray-700">{d.status}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {d.fileName ? (
                        <Button variant="outline" size="sm" onClick={() => window.alert(`Mock download: ${d.fileName}`)}>
                          <FileDown className="w-4 h-4 mr-2" />
                          Download LC file
                        </Button>
                      ) : null}
                      {d.invoiceUrl ? (
                        <a
                          href={d.invoiceUrl}
                          className="inline-flex items-center rounded-2xl border border-gray-200/60 bg-white px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-gray-50 transition-colors"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <FileSearch className="w-4 h-4 mr-2" />
                          View invoice link
                        </a>
                      ) : null}
                      <Link href={`/customer/orders/${d.orderId}`}>
                        <Button size="sm" variant="outline">
                          View order
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {tab === "insurance" && (
        <Card>
          <div className="p-6 border-b border-gray-100/60">
            <div className="text-lg font-black text-gray-900">Insurance documents</div>
            <div className="text-sm text-gray-500 mt-1">Claim records and attachments (mock).</div>
          </div>
          <CardContent className="p-6 space-y-3">
            {insuranceDocs.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
                <div className="text-lg font-black text-gray-900">No insurance claims</div>
                <div className="text-sm text-gray-500 mt-2">Create a claim from your orders page to see it here.</div>
              </div>
            ) : (
              insuranceDocs.map((c) => (
                <div key={c.orderId} className="rounded-3xl border border-gray-200/60 bg-white p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-gray-900">Order {c.orderId}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Status <span className="font-semibold text-gray-700">{c.status}</span> • Amount {c.amount || "—"}
                      </div>
                      {c.description ? <div className="text-sm text-gray-700 mt-2">{c.description}</div> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => window.alert("Mock: download insurance document")}>
                        <FileDown className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Link href={`/customer/orders/${c.orderId}`}>
                        <Button size="sm" variant="outline">
                          View order
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {tab === "invoices" && (
        <Card>
          <div className="p-6 border-b border-gray-100/60">
            <div className="text-lg font-black text-gray-900">Invoice files</div>
            <div className="text-sm text-gray-500 mt-1">Quick access to invoice-related records.</div>
          </div>
          <CardContent className="p-6 space-y-3">
            {invoiceDocs.length === 0 ? (
              <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-600">No invoices available.</div>
            ) : (
              invoiceDocs.slice(0, 12).map((o) => (
                <div key={o.id} className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-gray-900">{o.id}</div>
                    <div className="text-xs text-gray-500 mt-1">{o.invoices?.generatedAt ? new Date(o.invoices.generatedAt).toLocaleString() : "—"}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {o.invoices?.orderInvoiceHtml ? (
                      <Button variant="outline" size="sm" onClick={() => window.alert("Open Invoices page to print/download.")}>
                        <FileDown className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    ) : null}
                    <Link href="/customer/invoices">
                      <Button size="sm" variant="outline">
                        Open invoices
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </CustomerLayout>
  );
}
