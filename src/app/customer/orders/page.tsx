"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CustomerLayout } from "@/features/customer/CustomerLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { confirmDeliveryAndRelease, seedOrdersIfEmpty } from "@/services/orderStore";
import { sendDashboardNotification } from "@/services/emailService";
import { getCustomerById, getMerchantById } from "@/services/adminService";
import { loadSession } from "@/services/authStore";
import { useExchangeRatesUsd } from "@/services/exchangeRateService";
import { SUPPORTED_CURRENCIES, convertCurrency, formatCurrency } from "@/utils/currencyConverter";
import { type CurrencyCode, Order } from "@/types";
import { AlertCircle, Banknote, CheckCircle2, Clock, FileDown, FileSearch, ShieldCheck, Truck, Upload } from "lucide-react";
import { validateLcDocumentPack } from "@/services/lcDocumentValidationService";

const defaultCurrency = (): CurrencyCode => {
  const raw = (process.env.NEXT_PUBLIC_DEFAULT_CURRENCY as CurrencyCode | undefined) ?? "SAR";
  return SUPPORTED_CURRENCIES.includes(raw) ? raw : "SAR";
};

const badgeClass = (status: Order["status"]) => {
  if (status === "DELIVERED") return "bg-green-50 text-green-700 border-green-200/70";
  if (status === "SHIPPED") return "bg-blue-50 text-blue-700 border-blue-200/70";
  if (status === "PROCESSING") return "bg-amber-50 text-amber-800 border-amber-200/70";
  if (status === "PAID") return "bg-indigo-50 text-indigo-700 border-indigo-200/70";
  if (status === "CANCELLED") return "bg-red-50 text-red-700 border-red-200/70";
  return "bg-gray-50 text-gray-700 border-gray-200/70";
};

const resolvePaymentType = (order: Order) => {
  if (order.paymentType) return order.paymentType;
  if (order.paymentMethod === "ESCROW") return "escrow";
  if (order.paymentMethod === "LC") return "lc";
  if (order.paymentMethod === "BANK_TRANSFER" || order.paymentMethod === "COD") return "bank";
  return "card";
};

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

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>(defaultCurrency());
  const { loading: ratesLoading, result: ratesResult } = useExchangeRatesUsd();
  const ratesUsd = ratesResult?.ratesUsd;
  const [lcState, setLcState] = useState<
    Record<
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
    >
  >({});
  const [disputeState, setDisputeState] = useState<Record<string, { status: string; reason: string; description: string }>>(
    {},
  );
  const [claimState, setClaimState] = useState<Record<string, { status: string; amount: string; description: string }>>(
    {},
  );
  const [disputeModalFor, setDisputeModalFor] = useState<string | null>(null);
  const [claimModalFor, setClaimModalFor] = useState<string | null>(null);
  const [draftDisputeReason, setDraftDisputeReason] = useState("Delivery issue");
  const [draftDisputeDescription, setDraftDisputeDescription] = useState("");
  const [draftClaimAmount, setDraftClaimAmount] = useState("");
  const [draftClaimDescription, setDraftClaimDescription] = useState("");

  useEffect(() => {
    const session = loadSession();
    if (!session || session.user.role !== "CUSTOMER") return;
    setCustomerId(session.user.id);
    setOrders(seedOrdersIfEmpty().filter((o) => o.customerId === session.user.id));
  }, []);

  useEffect(() => {
    if (!customerId || typeof window === "undefined") return;
    const key = `msquare.currency.customer.${customerId}.v1`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    if (SUPPORTED_CURRENCIES.includes(raw as CurrencyCode)) setDisplayCurrency(raw as CurrencyCode);
  }, [customerId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("msquare.lcState.v1");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<
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
      if (parsed && typeof parsed === "object") {
        setLcState(parsed);
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("msquare.lcState.v1", JSON.stringify(lcState));
  }, [lcState]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("msquare.disputes.v1");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, { status: string; reason: string; description: string }>;
      if (parsed && typeof parsed === "object") setDisputeState(parsed);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("msquare.disputes.v1", JSON.stringify(disputeState));
  }, [disputeState]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("msquare.insuranceClaims.v1");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, { status: string; amount: string; description: string }>;
      if (parsed && typeof parsed === "object") setClaimState(parsed);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("msquare.insuranceClaims.v1", JSON.stringify(claimState));
  }, [claimState]);

  const sorted = useMemo(() => {
    return [...orders].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [orders]);

  return (
    <CustomerLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">My Orders</h1>
          <p className="text-gray-500">
            Track shipments and confirm delivery to release escrow payments to suppliers.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200/60 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm shadow-gray-900/5">
          <ShieldCheck className="w-4 h-4 text-primary-700" />
          MSquare Escrow Protection
        </div>
      </div>

      <div className="space-y-6">
        {sorted.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center mx-auto text-gray-400">
                <Clock className="w-7 h-7" />
              </div>
              <div className="mt-5 text-lg font-black text-gray-900">No orders yet</div>
              <p className="mt-2 text-sm text-gray-500">
                Your orders will appear here once you place an order from the marketplace.
              </p>
            </CardContent>
          </Card>
        ) : (
          sorted.map((order) => {
            const isAwaitingConfirmation = order.status === "SHIPPED";
            const paymentType = resolvePaymentType(order);
            const isEscrow = paymentType === "escrow";
            const isLc = paymentType === "lc";
            const isReleased = isEscrow && (order.escrowStatus === "RELEASED" || order.payoutStatus === "RELEASED");
            const trackingEvents = order.tracking?.events ?? [];
            const steps = ["Order Placed", "Processing", "Shipped", "Out for Delivery", "Delivered"];
            const completed = new Set(trackingEvents.map((e) => e.status));
            const lc = lcState[order.id] ?? {
              uploaded: false,
              status: "Draft pending",
            };
            const dispute = disputeState[order.id];
            const claim = claimState[order.id];

            return (
              <Card key={order.id} className="overflow-hidden">
                <div className="p-6 border-b border-gray-100/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/customer/orders/${order.id}`}
                        className="text-sm font-black text-gray-900 truncate hover:text-primary-700"
                      >
                        {order.id}
                      </Link>
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${badgeClass(
                          order.status,
                        )}`}
                      >
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
                      {dispute?.status === "OPEN" && (
                        <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                          Dispute Open
                        </span>
                      )}
                      {claim?.status === "OPEN" && (
                        <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                          Claim Open
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Placed on {order.createdAt} • {order.items.length} items • Payment:{" "}
                      <span className="font-semibold text-gray-700">{order.paymentMethod}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Total</div>
                      {(() => {
                        const originalAmount = order.originalAmount ?? order.totalAmount ?? 0;
                        const originalCurrency = (order.originalCurrency ?? defaultCurrency()) as CurrencyCode;
                        const converted =
                          ratesUsd && originalCurrency !== displayCurrency
                            ? convertCurrency(originalAmount, originalCurrency, displayCurrency, ratesUsd).convertedAmount
                            : null;
                        return (
                          <div className="text-base font-black text-gray-900">
                            {formatCurrency(originalAmount, originalCurrency)}
                            {converted !== null ? ` ≈ ${formatCurrency(converted, displayCurrency)}` : ""}
                          </div>
                        );
                      })()}
                      <div className="text-[11px] text-gray-500 mt-1">
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
                    <div className="flex flex-col sm:flex-row gap-2">
                      {isAwaitingConfirmation ? (
                        <Button onClick={() => setOrders(confirmDeliveryAndRelease(order.id))} className="whitespace-nowrap">
                          Confirm Delivery
                        </Button>
                      ) : (
                        <Button variant="outline" className="whitespace-nowrap" disabled>
                          {order.status === "DELIVERED" ? "Delivered" : "Tracking"}
                        </Button>
                      )}
                      <Link href={`/customer/orders/${order.id}`} className="hidden sm:block">
                        <Button variant="outline" size="sm" className="whitespace-nowrap">
                          Details
                        </Button>
                      </Link>
                      {order.invoices?.orderInvoiceHtml && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="whitespace-nowrap"
                            onClick={() =>
                              openPrintableDocument({ html: order.invoices?.orderInvoiceHtml ?? "", title: `Order Invoice - ${order.id}` })
                            }
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            Invoice
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="whitespace-nowrap"
                            onClick={() =>
                              downloadHtmlDocument({ html: order.invoices?.orderInvoiceHtml ?? "", filename: `MSquare-Order-Invoice-${order.id}.html` })
                            }
                          >
                            Download
                          </Button>
                        </>
                      )}
                      {isLc && order.invoices?.proformaInvoiceHtml && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="whitespace-nowrap"
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
                            className="whitespace-nowrap"
                            onClick={() =>
                              downloadHtmlDocument({ html: order.invoices?.proformaInvoiceHtml ?? "", filename: `MSquare-Proforma-Invoice-${order.id}.html` })
                            }
                          >
                            Download
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap"
                        onClick={() => {
                          setDraftDisputeDescription("");
                          setDisputeModalFor(order.id);
                        }}
                      >
                        Open Dispute
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap"
                        disabled={!order.insuranceEnabled}
                        onClick={() => {
                          setDraftClaimAmount("");
                          setDraftClaimDescription("");
                          setClaimModalFor(order.id);
                        }}
                      >
                        File Claim
                      </Button>
                    </div>
                  </div>
                </div>

                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <div className="text-sm font-black text-gray-900 mb-3">Order Items</div>
                      <div className="space-y-3">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3 flex items-center justify-between gap-4"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">{item.productName}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                Qty {item.quantity} • {formatCurrency(item.price, (order.originalCurrency ?? defaultCurrency()) as CurrencyCode)}
                              </div>
                            </div>
                            <div className="text-sm font-black text-gray-900">
                              {formatCurrency(item.price * item.quantity, (order.originalCurrency ?? defaultCurrency()) as CurrencyCode)}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 rounded-3xl border border-gray-200/60 bg-white p-5">
                        <div className="text-sm font-black text-gray-900 mb-4">Order Tracking</div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="text-sm font-semibold text-gray-700">
                            Tracking: <span className="font-black text-gray-900">{order.tracking?.trackingNumber ?? "Pending"}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            Carrier: <span className="font-semibold text-gray-700">{order.tracking?.carrier ?? "MSquare Logistics"}</span>
                          </div>
                        </div>
                        <div className="mt-5 grid grid-cols-1 sm:grid-cols-5 gap-3">
                          {steps.map((s) => {
                            const done =
                              completed.has(s) ||
                              (s === "Processing" && (order.status === "PROCESSING" || order.status === "SHIPPED" || order.status === "DELIVERED")) ||
                              (s === "Shipped" && (order.status === "SHIPPED" || order.status === "DELIVERED")) ||
                              (s === "Delivered" && order.status === "DELIVERED");
                            const ts = trackingEvents.find((e) => e.status === s)?.at;
                            return (
                              <div key={s} className={`rounded-2xl border px-3 py-3 ${done ? "border-green-200/70 bg-green-50" : "border-gray-200/60 bg-gray-50"}`}>
                                <div className={`text-xs font-black ${done ? "text-green-800" : "text-gray-700"}`}>{s}</div>
                                <div className="text-[11px] text-gray-500 mt-1">{ts ? new Date(ts).toLocaleString() : "—"}</div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-5 space-y-2">
                          {(trackingEvents.length > 0
                            ? trackingEvents
                            : [{ status: "Order Placed", at: `${order.createdAt}T00:00:00.000Z` } as any]
                          ).map((e: any, idx: number) => (
                            <div key={`${e.status}-${idx}`} className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="text-sm font-black text-gray-900">{e.status}</div>
                                  {e.note && <div className="text-xs text-gray-600 mt-1">{e.note}</div>}
                                </div>
                                <div className="text-xs font-semibold text-gray-500 whitespace-nowrap">{new Date(e.at).toLocaleString()}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-3xl border border-gray-200/60 bg-white p-5">
                        <div className="text-sm font-black text-gray-900 mb-4">Shipping Details</div>
                        <div className="text-sm text-gray-700">
                          Method: <span className="font-black text-gray-900">{order.shipping?.methodName ?? "Standard"}</span>
                        </div>
                        <div className="text-sm text-gray-700 mt-2">
                          Cost:{" "}
                          <span className="font-black text-gray-900">
                            {formatCurrency(order.shipping?.cost ?? 0, (order.originalCurrency ?? defaultCurrency()) as CurrencyCode)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 mt-2">
                          Estimate: <span className="font-black text-gray-900">{order.shipping?.estimatedDays ?? 6} days</span>
                        </div>
                      </div>
                      {isEscrow && (
                        <div className="rounded-3xl border border-gray-200/60 bg-gray-50 p-5">
                          <div className="text-sm font-black text-gray-900 mb-4">Escrow Status</div>

                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-2xl bg-white border border-gray-200/60 flex items-center justify-center text-gray-600">
                                <Banknote className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">Payment held by MSquare</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Funds stay in escrow until you confirm delivery.
                                </div>
                              </div>
                            </div>

                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-2xl bg-white border border-gray-200/60 flex items-center justify-center text-gray-600">
                                <Truck className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">Supplier ships the product</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Shipment status updates as the order moves.
                                </div>
                              </div>
                            </div>

                            <div className="flex items-start gap-3">
                              <div
                                className={`w-9 h-9 rounded-2xl bg-white border flex items-center justify-center ${
                                  isReleased ? "border-green-200/70 text-green-700" : "border-gray-200/60 text-gray-600"
                                }`}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">Release to supplier</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {isReleased
                                    ? "Released to the supplier after delivery confirmation."
                                    : "Pending your delivery confirmation."}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {isLc && (
                        <div className="rounded-3xl border border-gray-200/60 bg-white p-5">
                          <div className="text-sm font-black text-gray-900 mb-4">LC Workflow</div>
                          <div className="space-y-3">
                            <div className="w-full">
                              <input
                                id={`lc-upload-${order.id}`}
                                type="file"
                                className="hidden"
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (!file) return;
                                  const merchantEmail = getMerchantById(order.merchantId)?.email;
                                  const customerEmail = getCustomerById(order.customerId)?.email;
                                  const message = `LC documents uploaded for order ${order.id}.`;
                                  if (merchantEmail) {
                                    void sendDashboardNotification({
                                      to: merchantEmail,
                                      title: "LC update",
                                      message,
                                      meta: { event: "lc_upload", orderId: order.id },
                                    });
                                  }
                                  if (customerEmail) {
                                    void sendDashboardNotification({
                                      to: customerEmail,
                                      title: "LC update",
                                      message,
                                      meta: { event: "lc_upload", orderId: order.id },
                                    });
                                  }
                                  setLcState((prev) => ({
                                    ...prev,
                                    [order.id]: {
                                      uploaded: true,
                                      status: "Documents uploaded",
                                      lastAction: "LC uploaded",
                                      fileName: file.name,
                                      invoiceUrl: prev[order.id]?.invoiceUrl,
                                      invoiceNumber: prev[order.id]?.invoiceNumber,
                                      invoiceDate: prev[order.id]?.invoiceDate,
                                      shipmentDate: prev[order.id]?.shipmentDate,
                                      certificateText: prev[order.id]?.certificateText,
                                      insuranceCoveragePercent: prev[order.id]?.insuranceCoveragePercent,
                                    },
                                  }));
                                }}
                              />
                              <label
                                htmlFor={`lc-upload-${order.id}`}
                                className="flex w-full items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
                              >
                                <Upload className="w-4 h-4" />
                                Upload LC
                              </label>
                            </div>
                            {(() => {
                              const hasData = Boolean(
                                lc.fileName ||
                                  lc.invoiceNumber ||
                                  lc.invoiceDate ||
                                  lc.shipmentDate ||
                                  lc.certificateText ||
                                  lc.insuranceCoveragePercent !== undefined,
                              );
                              if (!hasData) {
                                return (
                                  <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-4">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="text-sm font-black text-gray-900">LC validation (UCP 600)</div>
                                      <span className="inline-flex items-center rounded-full border border-gray-200/70 bg-white px-3 py-1 text-xs font-black text-gray-700">
                                        Awaiting details
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-2">
                                      Upload the LC document pack and fill the fields to detect bank discrepancies early.
                                    </div>
                                  </div>
                                );
                              }
                              const validation = validateLcDocumentPack(order, lc);
                              const issueCount = validation.errors.length + validation.warnings.length;
                              return (
                                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-4">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-black text-gray-900">LC validation (UCP 600)</div>
                                    {validation.passed ? (
                                      <span className="inline-flex items-center rounded-full border border-green-200/70 bg-green-50 px-3 py-1 text-xs font-black text-green-800">
                                        Validated
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center rounded-full border border-red-200/70 bg-red-50 px-3 py-1 text-xs font-black text-red-800">
                                        Discrepancies {issueCount}
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <div className="text-xs font-black text-gray-700 mb-1">Invoice number</div>
                                      <input
                                        value={lc.invoiceNumber ?? ""}
                                        onChange={(e) =>
                                          setLcState((prev) => ({
                                            ...prev,
                                            [order.id]: { ...prev[order.id], invoiceNumber: e.target.value },
                                          }))
                                        }
                                        className="w-full rounded-xl border border-gray-200/70 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
                                        placeholder="e.g., INV-2026-000123"
                                      />
                                    </div>
                                    <div>
                                      <div className="text-xs font-black text-gray-700 mb-1">Invoice date</div>
                                      <input
                                        value={lc.invoiceDate ?? ""}
                                        onChange={(e) =>
                                          setLcState((prev) => ({
                                            ...prev,
                                            [order.id]: { ...prev[order.id], invoiceDate: e.target.value },
                                          }))
                                        }
                                        className="w-full rounded-xl border border-gray-200/70 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
                                        placeholder="YYYY-MM-DD"
                                      />
                                    </div>
                                    <div>
                                      <div className="text-xs font-black text-gray-700 mb-1">Shipment date</div>
                                      <input
                                        value={lc.shipmentDate ?? ""}
                                        onChange={(e) =>
                                          setLcState((prev) => ({
                                            ...prev,
                                            [order.id]: { ...prev[order.id], shipmentDate: e.target.value },
                                          }))
                                        }
                                        className="w-full rounded-xl border border-gray-200/70 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
                                        placeholder="YYYY-MM-DD"
                                      />
                                    </div>
                                    <div>
                                      <div className="text-xs font-black text-gray-700 mb-1">Insurance coverage (%)</div>
                                      <input
                                        value={lc.insuranceCoveragePercent?.toString() ?? ""}
                                        onChange={(e) => {
                                          const n = Number(e.target.value);
                                          setLcState((prev) => ({
                                            ...prev,
                                            [order.id]: {
                                              ...prev[order.id],
                                              insuranceCoveragePercent: Number.isFinite(n) ? n : undefined,
                                            },
                                          }));
                                        }}
                                        inputMode="decimal"
                                        className="w-full rounded-xl border border-gray-200/70 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
                                        placeholder="e.g., 110"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <div className="text-xs font-black text-gray-700 mb-1">Certificate wording</div>
                                      <textarea
                                        value={lc.certificateText ?? ""}
                                        onChange={(e) =>
                                          setLcState((prev) => ({
                                            ...prev,
                                            [order.id]: { ...prev[order.id], certificateText: e.target.value },
                                          }))
                                        }
                                        rows={3}
                                        className="w-full rounded-xl border border-gray-200/70 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
                                        placeholder={`Include wording and reference ${order.id}`}
                                      />
                                    </div>
                                  </div>

                                  {validation.errors.length > 0 && (
                                    <div className="mt-4 rounded-2xl border border-red-200/70 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                                      <div className="font-black">Bank discrepancies</div>
                                      <ul className="mt-2 list-disc pl-5 space-y-1">
                                        {validation.errors.map((f, idx) => (
                                          <li key={`${f.code}_${idx}`}>{f.message}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {validation.warnings.length > 0 && (
                                    <div className="mt-3 rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                                      <div className="font-black">Warnings</div>
                                      <ul className="mt-2 list-disc pl-5 space-y-1">
                                        {validation.warnings.map((f, idx) => (
                                          <li key={`${f.code}_${idx}`}>{f.message}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                            <Button
                              variant="outline"
                              className="w-full justify-start gap-2"
                              onClick={() =>
                                setLcState((prev) => ({
                                  ...prev,
                                  [order.id]: {
                                    uploaded: prev[order.id]?.uploaded ?? false,
                                    status: prev[order.id]?.uploaded ? "Under bank review" : "Awaiting documents",
                                    lastAction: "Status checked",
                                  },
                                }))
                              }
                            >
                              <FileSearch className="w-4 h-4" />
                              Track LC status
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full justify-start gap-2"
                              onClick={() => {
                                if (order.invoices?.proformaInvoiceHtml) {
                                  openPrintableDocument({ html: order.invoices.proformaInvoiceHtml, title: `Proforma Invoice - ${order.id}` });
                                }
                                setLcState((prev) => ({
                                  ...prev,
                                  [order.id]: {
                                    uploaded: prev[order.id]?.uploaded ?? false,
                                    status: prev[order.id]?.status ?? "Draft pending",
                                    lastAction: "Proforma invoice opened",
                                    fileName: prev[order.id]?.fileName,
                                    invoiceUrl: prev[order.id]?.invoiceUrl,
                                  },
                                }));
                              }}
                            >
                              <FileDown className="w-4 h-4" />
                              Proforma invoice
                            </Button>
                          </div>
                          <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2">
                            <div className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                              LC Status
                            </div>
                            <div className="text-sm font-semibold text-gray-800">{lc.status}</div>
                            <div className="text-xs text-gray-500 mt-2">
                              {lc.fileName ? `Uploaded file: ${lc.fileName}` : "Uploaded file: None"}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Proforma invoice:{" "}
                              {order.invoices?.proformaInvoiceHtml ? (
                                <span className="font-semibold text-gray-700">Available</span>
                              ) : (
                                "Not generated"
                              )}
                            </div>
                            {lc.lastAction && (
                              <div className="text-[11px] text-gray-500 mt-1">Last action: {lc.lastAction}</div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="rounded-3xl border border-gray-200/60 bg-white p-5">
                        <div className="text-sm font-black text-gray-900 mb-4">Dispute Resolution</div>
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-600">
                            <AlertCircle className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900">
                              {dispute?.status ? dispute.status : "Not opened"}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Submit an issue for review. Admin will evaluate and respond.
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-gray-200/60 bg-white p-5">
                        <div className="text-sm font-black text-gray-900 mb-4">Shipment Insurance</div>
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-600">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900">
                              {order.insuranceEnabled ? "Enabled" : "Not enabled"}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {claim?.status ? `Claim: ${claim.status}` : "File a claim if the shipment is damaged or delayed."}
                            </div>
                          </div>
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

      {disputeModalFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            onClick={() => setDisputeModalFor(null)}
            aria-label="Close"
          />
          <div className="relative w-full max-w-lg">
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="text-lg font-black text-gray-900 mb-1">Open Dispute</div>
                <div className="text-sm text-gray-500 mb-6">Order {disputeModalFor}</div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Reason</label>
                    <select
                      value={draftDisputeReason}
                      onChange={(e) => setDraftDisputeReason(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                    >
                      <option>Delivery issue</option>
                      <option>Item not as described</option>
                      <option>Damaged shipment</option>
                      <option>Missing items</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      value={draftDisputeDescription}
                      onChange={(e) => setDraftDisputeDescription(e.target.value)}
                      rows={4}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                      placeholder="Describe the issue and attach evidence in LC/Documents if needed."
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <Button variant="secondary" onClick={() => setDisputeModalFor(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (!disputeModalFor) return;
                      setDisputeState((prev) => ({
                        ...prev,
                        [disputeModalFor]: {
                          status: "OPEN",
                          reason: draftDisputeReason,
                          description: draftDisputeDescription,
                        },
                      }));
                      const o = orders.find((x) => x.id === disputeModalFor);
                      if (o) {
                        const merchantEmail = getMerchantById(o.merchantId)?.email;
                        const customerEmail = getCustomerById(o.customerId)?.email;
                        const message = `New dispute opened for order ${o.id}.`;
                        if (merchantEmail) {
                          void sendDashboardNotification({
                            to: merchantEmail,
                            title: "Dispute update",
                            message,
                            meta: { event: "dispute_opened", orderId: o.id },
                          });
                        }
                        if (customerEmail) {
                          void sendDashboardNotification({
                            to: customerEmail,
                            title: "Dispute update",
                            message,
                            meta: { event: "dispute_opened", orderId: o.id },
                          });
                        }
                      }
                      setDisputeModalFor(null);
                    }}
                  >
                    Submit
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {claimModalFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            onClick={() => setClaimModalFor(null)}
            aria-label="Close"
          />
          <div className="relative w-full max-w-lg">
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="text-lg font-black text-gray-900 mb-1">Insurance Claim</div>
                <div className="text-sm text-gray-500 mb-6">Order {claimModalFor}</div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Claim Amount (USD)</label>
                    <input
                      value={draftClaimAmount}
                      onChange={(e) => setDraftClaimAmount(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                      placeholder="e.g., 120.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      value={draftClaimDescription}
                      onChange={(e) => setDraftClaimDescription(e.target.value)}
                      rows={4}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                      placeholder="Describe the incident (damage, loss, delay)."
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <Button variant="secondary" onClick={() => setClaimModalFor(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (!claimModalFor) return;
                      setClaimState((prev) => ({
                        ...prev,
                        [claimModalFor]: {
                          status: "OPEN",
                          amount: draftClaimAmount,
                          description: draftClaimDescription,
                        },
                      }));
                      const o = orders.find((x) => x.id === claimModalFor);
                      if (o) {
                        const merchantEmail = getMerchantById(o.merchantId)?.email;
                        const customerEmail = getCustomerById(o.customerId)?.email;
                        const message = `Insurance claim filed for order ${o.id}.`;
                        if (merchantEmail) {
                          void sendDashboardNotification({
                            to: merchantEmail,
                            title: "Dispute update",
                            message,
                            meta: { event: "claim_opened", orderId: o.id },
                          });
                        }
                        if (customerEmail) {
                          void sendDashboardNotification({
                            to: customerEmail,
                            title: "Dispute update",
                            message,
                            meta: { event: "claim_opened", orderId: o.id },
                          });
                        }
                      }
                      setClaimModalFor(null);
                    }}
                  >
                    Submit
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </CustomerLayout>
  );
}
