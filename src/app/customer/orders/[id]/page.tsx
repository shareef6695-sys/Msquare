"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CustomerLayout } from "@/features/customer/CustomerLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { confirmDeliveryAndRelease, loadOrders, seedOrdersIfEmpty } from "@/services/orderStore";
import { useExchangeRatesUsd } from "@/services/exchangeRateService";
import { SUPPORTED_CURRENCIES, convertCurrency, formatCurrency } from "@/utils/currencyConverter";
import { type CurrencyCode, type Order } from "@/types";
import { CheckCircle2, Clock, FileDown, Gavel, ShieldCheck, Truck } from "lucide-react";

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

const timeline = ["Order Placed", "Payment secured", "Processing", "Shipped", "Out for Delivery", "Delivered"];

type DisputeState = Record<string, { status: string; reason: string; description: string }>;

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export default function CustomerOrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id;

  const [orders, setOrders] = useState<Order[]>([]);
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>(defaultCurrency());
  const { loading: ratesLoading, result: ratesResult } = useExchangeRatesUsd();
  const ratesUsd = ratesResult?.ratesUsd;
  const [disputes, setDisputes] = useState<DisputeState>({});
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("Delivery issue");
  const [disputeDescription, setDisputeDescription] = useState("");

  useEffect(() => {
    setOrders(seedOrdersIfEmpty());
  }, []);

  const order = useMemo(() => orders.find((o) => o.id === orderId) ?? null, [orders, orderId]);

  useEffect(() => {
    if (!order || typeof window === "undefined") return;
    const key = `msquare.currency.customer.${order.customerId}.v1`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    if (SUPPORTED_CURRENCIES.includes(raw as CurrencyCode)) setDisplayCurrency(raw as CurrencyCode);
  }, [order]);

  const trackingEvents = order?.tracking?.events ?? [];
  const latestStatus = trackingEvents[trackingEvents.length - 1]?.status ?? order?.status ?? "PROCESSING";

  const reachedStep = (label: string) => {
    const byEvent = trackingEvents.some((e) => e.status === label);
    if (byEvent) return true;
    if (!order) return false;
    if (label === "Order Placed") return true;
    if (label === "Payment secured") return order.paymentStatus === "COMPLETED" || order.status === "PAID" || order.status === "PROCESSING" || order.status === "SHIPPED" || order.status === "DELIVERED";
    if (label === "Processing") return order.status === "PROCESSING" || order.status === "SHIPPED" || order.status === "DELIVERED";
    if (label === "Shipped") return order.status === "SHIPPED" || order.status === "DELIVERED";
    if (label === "Out for Delivery") return order.status === "DELIVERED";
    if (label === "Delivered") return order.status === "DELIVERED";
    return false;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDisputes(safeJsonParse<DisputeState>(window.localStorage.getItem("msquare.disputes.v1"), {}));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("msquare.disputes.v1", JSON.stringify(disputes));
  }, [disputes]);

  const estimatedDelivery = useMemo(() => {
    if (!order) return null;
    const created = Date.parse(order.createdAt);
    if (!Number.isFinite(created)) return null;
    const etaDays = order.shipping?.estimatedDays ?? 10;
    const d = new Date(created + etaDays * 24 * 60 * 60 * 1000);
    return d;
  }, [order]);

  const dispute = order ? disputes[order.id] : undefined;

  const Modal = ({ open, title, children }: { open: boolean; title: string; children: React.ReactNode }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <button className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setDisputeOpen(false)} />
        <div className="relative w-full max-w-lg rounded-3xl border border-gray-200/60 bg-white shadow-xl shadow-gray-900/20">
          <div className="p-6 border-b border-gray-100/60">
            <div className="text-lg font-black text-gray-900">{title}</div>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    );
  };

  return (
    <CustomerLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-gray-900 truncate">Order details</h1>
          <p className="text-gray-500 truncate">{orderId}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link href="/customer/orders">
            <Button variant="outline">Back to orders</Button>
          </Link>
          <Link href="/customer/support">
            <Button variant="outline">Support</Button>
          </Link>
          {order?.status === "SHIPPED" && (
            <Button onClick={() => setOrders(confirmDeliveryAndRelease(order.id))}>Confirm delivery</Button>
          )}
        </div>
      </div>

      {!order ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
          <div className="text-lg font-black text-gray-900">Order not found</div>
          <div className="text-sm text-gray-500 mt-2">Return to your orders list.</div>
          <Link href="/customer/orders">
            <Button className="mt-6">View orders</Button>
          </Link>
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
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Latest</div>
                <div className="text-sm font-black text-gray-900 mt-1">{latestStatus}</div>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="text-sm font-black text-gray-900 mb-3">Tracking timeline</div>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
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
                    {estimatedDelivery ? (
                      <div className="text-sm font-semibold text-gray-700">
                        Estimated delivery: <span className="font-black text-gray-900">{estimatedDelivery.toLocaleDateString()}</span>
                      </div>
                    ) : null}
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
                <div className="text-lg font-black text-gray-900">Status</div>
              </div>
              <CardContent className="p-6 space-y-3">
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <div className="text-sm font-semibold text-gray-700">Current: <span className="font-black text-gray-900">{order.status}</span></div>
                </div>
                <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Escrow</div>
                  <div className="text-sm font-black text-gray-900 mt-1">{order.paymentStatus}</div>
                  <div className="text-xs text-gray-500 mt-1">Delivery confirmation releases funds to the merchant.</div>
                </div>
                <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Protection</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {order.tradeAssurance ? (
                      <span className="inline-flex items-center rounded-full border border-primary-200/70 bg-primary-50 px-3 py-1 text-xs font-black text-primary-800">
                        Trade Assurance
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-gray-200/70 bg-gray-50 px-3 py-1 text-xs font-black text-gray-700">
                        Standard
                      </span>
                    )}
                    {order.insuranceEnabled ? (
                      <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">
                        Shipment insured
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-gray-200/70 bg-gray-50 px-3 py-1 text-xs font-black text-gray-700">
                        Not insured
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <div className="p-6 border-b border-gray-100/60">
                <div className="text-lg font-black text-gray-900">Help</div>
              </div>
              <CardContent className="p-6 space-y-3">
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  Updates are mocked for demo. Merchant marks orders shipped; customer confirms delivery.
                </div>
                <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-gray-900">Dispute</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {dispute ? (
                          <span>
                            Status <span className="font-semibold text-gray-700">{dispute.status}</span> • {dispute.reason}
                          </span>
                        ) : (
                          <span>No dispute opened for this order.</span>
                        )}
                      </div>
                    </div>
                    <Gavel className="w-5 h-5 text-amber-700" />
                  </div>
                  <Button
                    className="mt-4 w-full"
                    variant="outline"
                    onClick={() => {
                      setDisputeReason(dispute?.reason ?? "Delivery issue");
                      setDisputeDescription(dispute?.description ?? "");
                      setDisputeOpen(true);
                    }}
                  >
                    {dispute ? "Update dispute" : "Open dispute"}
                  </Button>
                </div>
                <Link href="/customer/notifications" className="block">
                  <Button variant="outline" className="w-full">
                    View notifications
                  </Button>
                </Link>
                <Link href="/customer/support" className="block">
                  <Button variant="outline" className="w-full">
                    Contact support
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Modal open={disputeOpen} title={`Dispute • ${order?.id ?? ""}`}>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <div className="text-sm font-black text-gray-900 mb-2">Reason</div>
            <select
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option>Delivery issue</option>
              <option>Damaged goods</option>
              <option>Wrong items</option>
              <option>Quality issue</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <div className="text-sm font-black text-gray-900 mb-2">Description</div>
            <textarea
              value={disputeDescription}
              onChange={(e) => setDisputeDescription(e.target.value)}
              rows={5}
              className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="Explain the issue…"
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setDisputeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!order) return;
                setDisputes((d) => ({
                  ...d,
                  [order.id]: {
                    status: dispute?.status ?? "OPEN",
                    reason: disputeReason.trim() || "Issue",
                    description: disputeDescription.trim() || "Customer opened a dispute.",
                  },
                }));
                setDisputeOpen(false);
              }}
              disabled={!order}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </CustomerLayout>
  );
}
