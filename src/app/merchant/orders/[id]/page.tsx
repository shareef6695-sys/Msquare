"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MerchantLayout } from "@/features/merchant/MerchantLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { loadSession } from "@/services/authStore";
import { loadOrders, markOrderShipped, seedOrdersIfEmpty } from "@/services/orderStore";
import { useExchangeRatesUsd } from "@/services/exchangeRateService";
import { SUPPORTED_CURRENCIES, convertCurrency, formatCurrency } from "@/utils/currencyConverter";
import { type CurrencyCode, type Order } from "@/types";
import { FileDown, Truck } from "lucide-react";

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

const defaultCurrency = (): CurrencyCode => {
  const raw = (process.env.NEXT_PUBLIC_DEFAULT_CURRENCY as CurrencyCode | undefined) ?? "SAR";
  return SUPPORTED_CURRENCIES.includes(raw) ? raw : "SAR";
};

const timeline = ["Order Placed", "Processing", "Shipped", "Out for Delivery", "Delivered"];

export default function MerchantOrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id;

  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [teamRole, setTeamRole] = useState<"admin" | "manager" | "viewer">("admin");
  const [orders, setOrders] = useState<Order[]>([]);
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>(defaultCurrency());
  const { loading: ratesLoading, result: ratesResult } = useExchangeRatesUsd();
  const ratesUsd = ratesResult?.ratesUsd;

  useEffect(() => {
    setOrders(seedOrdersIfEmpty());
    const session = loadSession();
    if (!session || session.user.role !== "MERCHANT") return;
    setMerchantId(session.user.merchantParentId ?? session.user.id);
    setTeamRole((session.user.merchantTeamRole ?? "admin") as any);
  }, []);

  useEffect(() => {
    if (!merchantId || typeof window === "undefined") return;
    const key = `msquare.currency.merchant.${merchantId}.v1`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    if (SUPPORTED_CURRENCIES.includes(raw as CurrencyCode)) setDisplayCurrency(raw as CurrencyCode);
  }, [merchantId]);

  const order = useMemo(() => {
    if (!orderId) return null;
    const o = orders.find((x) => x.id === orderId) ?? null;
    if (!o) return null;
    if (merchantId && o.merchantId !== merchantId) return null;
    return o;
  }, [merchantId, orderId, orders]);

  const trackingEvents = order?.tracking?.events ?? [];

  const reachedStep = (label: string) => {
    const byEvent = trackingEvents.some((e) => e.status === label);
    if (byEvent) return true;
    if (!order) return false;
    if (label === "Order Placed") return true;
    if (label === "Processing") return order.status === "PROCESSING" || order.status === "SHIPPED" || order.status === "DELIVERED";
    if (label === "Shipped") return order.status === "SHIPPED" || order.status === "DELIVERED";
    if (label === "Out for Delivery") return order.status === "DELIVERED";
    if (label === "Delivered") return order.status === "DELIVERED";
    return false;
  };

  const canShip = order?.status === "PROCESSING" || order?.status === "PAID";

  return (
    <MerchantLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-gray-900 truncate">Order details</h1>
          <p className="text-gray-500 truncate">{orderId}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link href="/merchant/orders">
            <Button variant="outline">Back to orders</Button>
          </Link>
          {canShip && (
            <Button
              disabled={teamRole === "viewer"}
              title={teamRole === "viewer" ? "Viewer role cannot update shipment status." : undefined}
              onClick={() => {
                if (!order) return;
                const next = markOrderShipped(order.id);
                setOrders(next);
              }}
            >
              Mark shipped
            </Button>
          )}
        </div>
      </div>

      {!order ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
          <div className="text-lg font-black text-gray-900">Order not found</div>
          <div className="text-sm text-gray-500 mt-2">This order may not exist or does not belong to your merchant account.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <div className="p-6 border-b border-gray-100/60 flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-black text-gray-900">{order.id}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {(() => {
                    const originalAmount = order.originalAmount ?? order.totalAmount ?? 0;
                    const originalCurrency = (order.originalCurrency ?? defaultCurrency()) as CurrencyCode;
                    const converted =
                      ratesUsd && originalCurrency !== displayCurrency
                        ? convertCurrency(originalAmount, originalCurrency, displayCurrency, ratesUsd).convertedAmount
                        : null;
                    return (
                      <span>
                        {order.items.length} items • {formatCurrency(originalAmount, originalCurrency)}
                        {converted !== null ? ` ≈ ${formatCurrency(converted, displayCurrency)}` : ""} • {order.paymentMethod}
                      </span>
                    );
                  })()}
                </div>
                <div className="text-[11px] text-gray-500 mt-2">
                  {ratesLoading ? (
                    <span>Loading exchange rate…</span>
                  ) : ratesResult ? (
                    <span>
                      Converted using live exchange rate • Last updated: {new Date(ratesResult.updatedAt).toLocaleString()}
                      {ratesResult.usedFallback ? " • Using last available exchange rate" : ""}
                      {ratesResult.stale ? " • Rate may be outdated" : ""}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Status</div>
                <div className="text-sm font-black text-gray-900 mt-1">{order.status}</div>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="text-sm font-black text-gray-900 mb-3">Tracking timeline</div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {timeline.map((step) => {
                  const done = reachedStep(step);
                  return (
                    <div
                      key={step}
                      className={`rounded-2xl border px-4 py-3 text-center ${
                        done ? "border-emerald-200/70 bg-emerald-50" : "border-gray-200/60 bg-white"
                      }`}
                    >
                      <div className={`text-xs font-black ${done ? "text-emerald-800" : "text-gray-700"}`}>{step}</div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-black text-gray-900 mb-3">Shipment</div>
                  <div className="rounded-3xl border border-gray-200/60 bg-white p-5 space-y-2">
                    <div className="text-sm font-semibold text-gray-700">
                      Tracking number: <span className="font-black text-gray-900">{order.tracking?.trackingNumber ?? "Pending"}</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-700">
                      Carrier: <span className="font-black text-gray-900">{order.tracking?.carrier ?? "MSquare Logistics"}</span>
                    </div>
                    {order.shipping && (
                      <div className="text-sm font-semibold text-gray-700">
                        Method: <span className="font-black text-gray-900">{order.shipping.methodName}</span> • ETA {order.shipping.estimatedDays} days
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-black text-gray-900 mb-3">Documents</div>
                  <div className="rounded-3xl border border-gray-200/60 bg-white p-5 space-y-3">
                    {order.invoices?.orderInvoiceHtml ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPrintableDocument({ html: order.invoices?.orderInvoiceHtml ?? "", title: `Order Invoice - ${order.id}` })}
                        >
                          <FileDown className="w-4 h-4 mr-2" />
                          Invoice
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadHtmlDocument({ html: order.invoices?.orderInvoiceHtml ?? "", filename: `MSquare-Order-Invoice-${order.id}.html` })
                          }
                        >
                          Download
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-600">Invoice not available.</div>
                    )}

                    {order.paymentMethod === "LC" && order.invoices?.proformaInvoiceHtml && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            openPrintableDocument({ html: order.invoices?.proformaInvoiceHtml ?? "", title: `Proforma Invoice - ${order.id}` })
                          }
                        >
                          <FileDown className="w-4 h-4 mr-2" />
                          Proforma
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadHtmlDocument({ html: order.invoices?.proformaInvoiceHtml ?? "", filename: `MSquare-Proforma-Invoice-${order.id}.html` })
                          }
                        >
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-sm font-black text-gray-900 mb-3">Items</div>
                <div className="space-y-3">
                  {order.items.map((it) => (
                    <div key={it.id} className="rounded-3xl border border-gray-200/60 bg-white p-5 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-black text-gray-900 truncate">{it.productName}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Qty {it.quantity} • {formatCurrency(it.price, (order.originalCurrency ?? defaultCurrency()) as CurrencyCode)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-2 text-sm font-black text-gray-900">
                        {formatCurrency(it.price * it.quantity, (order.originalCurrency ?? defaultCurrency()) as CurrencyCode)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <div className="p-6 border-b border-gray-100/60">
                <div className="text-lg font-black text-gray-900">Actions</div>
              </div>
              <CardContent className="p-6 space-y-3">
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 flex items-start gap-3">
                  <Truck className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div className="text-sm text-gray-700">
                    Mark shipped to generate the shipment timeline updates for the customer.
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (!orderId) return;
                    const refreshed = loadOrders();
                    setOrders(refreshed);
                  }}
                >
                  Refresh order
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </MerchantLayout>
  );
}
