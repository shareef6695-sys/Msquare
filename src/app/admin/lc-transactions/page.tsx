"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { seedOrdersIfEmpty } from "@/services/orderStore";
import { useExchangeRatesUsd } from "@/services/exchangeRateService";
import { SUPPORTED_CURRENCIES, convertCurrency, formatCurrency } from "@/utils/currencyConverter";
import { type CurrencyCode, type Order } from "@/types";
import { FileText, ShieldCheck } from "lucide-react";

type LcUiState = Record<string, { uploaded: boolean; status: string; lastAction?: string; fileName?: string; invoiceUrl?: string }>;

const defaultCurrency = (): CurrencyCode => {
  const raw = (process.env.NEXT_PUBLIC_DEFAULT_CURRENCY as CurrencyCode | undefined) ?? "SAR";
  return SUPPORTED_CURRENCIES.includes(raw) ? raw : "SAR";
};

export default function AdminLcTransactionsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [lcState, setLcState] = useState<LcUiState>({});
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

  const lcOrders = useMemo(() => {
    return orders
      .filter((o) => o.paymentType === "lc" || o.paymentMethod === "LC")
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [orders]);

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">LC transactions</h1>
          <p className="text-gray-500">Track LC requests, documents, and bank status per order.</p>
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
                      Bank workflow
                    </div>
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
