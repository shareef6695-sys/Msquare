"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { setOrderLcStatus, seedOrdersIfEmpty } from "@/services/orderStore";
import { sendDashboardNotification } from "@/services/emailService";
import { getCustomerById, getMerchantById } from "@/services/adminService";
import { useExchangeRatesUsd } from "@/services/exchangeRateService";
import { SUPPORTED_CURRENCIES, convertCurrency, formatCurrency } from "@/utils/currencyConverter";
import { type CurrencyCode, type LcStatusType, type Order } from "@/types";
import { FileText, ShieldCheck } from "lucide-react";

type LcUiState = Record<
  string,
  { uploaded: boolean; status: string; lastAction?: string; fileName?: string; invoiceUrl?: string }
>;

type LcFilter = "all" | "under_review" | "accepted" | "settled";

const normalizeLcStatus = (order: Order, ui?: LcUiState[string]) => {
  return (order.lcStatus ?? ui?.status ?? "DRAFT").toString().toUpperCase();
};

const isUnderReview = (status: string) => {
  return ["DRAFT", "SUBMITTED", "BANK_REVIEW", "UNDER_REVIEW"].includes(status);
};

const defaultCurrency = (): CurrencyCode => {
  const raw = (process.env.NEXT_PUBLIC_DEFAULT_CURRENCY as CurrencyCode | undefined) ?? "SAR";
  return SUPPORTED_CURRENCIES.includes(raw) ? raw : "SAR";
};

export default function AdminLcRequestsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [lcState, setLcState] = useState<LcUiState>({});
  const [filter, setFilter] = useState<LcFilter>("under_review");
  const [toasts, setToasts] = useState<Array<{ id: string; message: string }>>([]);
  const [reportingCurrency, setReportingCurrency] = useState<CurrencyCode>(defaultCurrency());
  const { loading: ratesLoading, result: ratesResult } = useExchangeRatesUsd();
  const ratesUsd = ratesResult?.ratesUsd;

  useEffect(() => {
    setOrders(seedOrdersIfEmpty());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("msquare.currency.admin.v1");
    if (raw && SUPPORTED_CURRENCIES.includes(raw as CurrencyCode)) setReportingCurrency(raw as CurrencyCode);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("msquare.currency.admin.v1", reportingCurrency);
  }, [reportingCurrency]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("msquare.lcState.v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as LcUiState;
      if (parsed && typeof parsed === "object") setLcState(parsed);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("msquare.lcState.v1", JSON.stringify(lcState));
  }, [lcState]);

  const pushToast = (message: string) => {
    const id = `toast_${Math.random().toString(16).slice(2, 10)}`;
    setToasts((t) => [...t, { id, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };

  const updateLcStatus = async (order: Order, nextStatus: LcStatusType) => {
    setOrders(setOrderLcStatus(order.id, nextStatus));
    setLcState((prev) => ({
      ...prev,
      [order.id]: {
        uploaded: prev[order.id]?.uploaded ?? false,
        status: nextStatus,
        lastAction: `Set to ${nextStatus}`,
        fileName: prev[order.id]?.fileName,
        invoiceUrl: prev[order.id]?.invoiceUrl,
      },
    }));

    const merchantEmail = getMerchantById(order.merchantId)?.email;
    const customerEmail = getCustomerById(order.customerId)?.email;
    const message = `LC status updated to ${nextStatus} for order ${order.id}.`;

    if (merchantEmail) {
      void sendDashboardNotification({
        to: merchantEmail,
        title: "LC update",
        message,
        meta: { event: "lc_update", orderId: order.id, status: nextStatus },
      });
    }
    if (customerEmail) {
      void sendDashboardNotification({
        to: customerEmail,
        title: "LC update",
        message,
        meta: { event: "lc_update", orderId: order.id, status: nextStatus },
      });
    }
    pushToast(`LC updated: ${order.id} → ${nextStatus}`);
  };

  const lcOrders = useMemo(() => {
    return orders
      .filter((o) => o.paymentType === "lc" || o.paymentMethod === "LC")
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [orders]);

  const filtered = useMemo(() => {
    return lcOrders.filter((o) => {
      const status = normalizeLcStatus(o, lcState[o.id]);
      if (filter === "all") return true;
      if (filter === "accepted") return ["ACCEPTED", "APPROVED"].includes(status);
      if (filter === "settled") return ["SETTLED", "PAID"].includes(status);
      return isUnderReview(status);
    });
  }, [filter, lcOrders, lcState]);

  const counts = useMemo(() => {
    const all = lcOrders.length;
    const under = lcOrders.filter((o) => isUnderReview(normalizeLcStatus(o, lcState[o.id]))).length;
    const accepted = lcOrders.filter((o) => ["ACCEPTED", "APPROVED"].includes(normalizeLcStatus(o, lcState[o.id]))).length;
    const settled = lcOrders.filter((o) => ["SETTLED", "PAID"].includes(normalizeLcStatus(o, lcState[o.id]))).length;
    return { all, under, accepted, settled };
  }, [lcOrders, lcState]);

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">LC requests</h1>
          <p className="text-gray-500">Review LC submissions, documents, and bank milestone status.</p>
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
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm shadow-gray-900/5">
            <div className="text-[11px] font-black uppercase tracking-widest text-gray-400">Reporting currency</div>
            <select
              value={reportingCurrency}
              onChange={(e) => setReportingCurrency(e.target.value as CurrencyCode)}
              className="mt-1 w-full bg-transparent text-sm font-black text-gray-900 focus:outline-none"
              disabled={ratesLoading}
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200/60 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm shadow-gray-900/5">
            <ShieldCheck className="w-4 h-4 text-primary-700" />
            Bank review queue
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { key: "under_review" as const, label: `Under review (${counts.under})` },
          { key: "accepted" as const, label: `Accepted (${counts.accepted})` },
          { key: "settled" as const, label: `Settled (${counts.settled})` },
          { key: "all" as const, label: `All (${counts.all})` },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              filter === tab.key ? "border-primary-200/70 bg-primary-50 text-primary-800" : "border-gray-200/60 bg-white text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-gray-500">No LC requests match this filter.</CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filtered.map((order) => {
            const ui = lcState[order.id];
            const status = normalizeLcStatus(order, ui);
            const originalAmount = order.originalAmount ?? order.totalAmount ?? 0;
            const originalCurrency = (order.originalCurrency ?? defaultCurrency()) as CurrencyCode;
            const convertedAmount = ratesUsd ? convertCurrency(originalAmount, originalCurrency, reportingCurrency, ratesUsd).convertedAmount : null;
            const showConverted = convertedAmount !== null && originalCurrency !== reportingCurrency;
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
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Amount</div>
                      <div className="text-sm font-black text-gray-900">{formatCurrency(originalAmount, originalCurrency)}</div>
                      {showConverted ? (
                        <div className="text-[11px] font-semibold text-gray-500 mt-1">≈ {formatCurrency(convertedAmount as number, reportingCurrency)}</div>
                      ) : null}
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200/60 bg-white px-3 py-1.5 text-xs font-bold text-gray-700">
                      <ShieldCheck className="w-4 h-4 text-primary-700" />
                      LC workflow
                    </div>
                  </div>
                </div>

                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <div className="text-sm font-black text-gray-900 mb-3">Documents</div>
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">Uploaded LC file</div>
                          <div className="text-xs text-gray-500 mt-1">{ui?.fileName ?? "None"}</div>
                        </div>
                        <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">Invoice link</div>
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
                          <div className="text-sm font-black text-gray-900">Bank status</div>
                          <div className="text-sm font-semibold text-gray-800 mt-1">{status}</div>
                          {ui?.lastAction && <div className="text-xs text-gray-500 mt-1">Last action: {ui.lastAction}</div>}
                        </div>
                      </div>
                      <div className="mt-4 text-[11px] font-bold uppercase tracking-widest text-gray-400">UI only</div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      onClick={() => void updateLcStatus(order, "UNDER_REVIEW")}
                      disabled={status === "UNDER_REVIEW" || status === "APPROVED" || status === "REJECTED" || status === "SETTLED"}
                    >
                      Mark under review
                    </Button>
                    <Button
                      onClick={() => void updateLcStatus(order, "APPROVED")}
                      disabled={status === "APPROVED" || status === "REJECTED" || status === "SETTLED"}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void updateLcStatus(order, "REJECTED")}
                      disabled={status === "REJECTED" || status === "SETTLED"}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void updateLcStatus(order, "SETTLED")}
                      disabled={status !== "APPROVED"}
                    >
                      Mark settled
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {toasts.length > 0 && (
        <div className="fixed right-4 top-4 z-[60] space-y-3">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="max-w-sm rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-lg shadow-gray-900/15"
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
