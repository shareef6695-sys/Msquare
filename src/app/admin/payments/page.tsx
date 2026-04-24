"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { seedOrdersIfEmpty } from "@/services/orderStore";
import { useExchangeRatesUsd } from "@/services/exchangeRateService";
import { SUPPORTED_CURRENCIES, convertCurrency, formatCurrency } from "@/utils/currencyConverter";
import { type CurrencyCode, type Order } from "@/types";
import { Banknote, ShieldCheck } from "lucide-react";

const defaultCurrency = (): CurrencyCode => {
  const raw = (process.env.NEXT_PUBLIC_DEFAULT_CURRENCY as CurrencyCode | undefined) ?? "SAR";
  return SUPPORTED_CURRENCIES.includes(raw) ? raw : "SAR";
};

export default function AdminPaymentsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
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

  const metrics = useMemo(() => {
    const convert = (o: Order) => {
      const originalAmount = o.originalAmount ?? o.totalAmount ?? 0;
      const originalCurrency = (o.originalCurrency ?? defaultCurrency()) as CurrencyCode;
      if (!ratesUsd) return originalAmount;
      return convertCurrency(originalAmount, originalCurrency, reportingCurrency, ratesUsd).convertedAmount;
    };

    const volume = orders.reduce((sum, o) => sum + convert(o), 0);
    const escrowHeld = orders.filter((o) => o.escrowStatus === "HELD").reduce((sum, o) => sum + convert(o), 0);
    const escrowReleased = orders.filter((o) => o.escrowStatus === "RELEASED").reduce((sum, o) => sum + convert(o), 0);
    const byType = orders.reduce<Record<string, number>>((acc, o) => {
      const t = o.paymentType ?? "unknown";
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    }, {});
    return { volume, escrowHeld, escrowReleased, byType };
  }, [orders, ratesUsd, reportingCurrency]);

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Payments</h1>
          <p className="text-gray-500">Track volume, escrow holds/releases, and payment types.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: "Total volume", value: formatCurrency(metrics.volume, reportingCurrency) },
          { label: "Escrow held", value: formatCurrency(metrics.escrowHeld, reportingCurrency) },
          { label: "Escrow released", value: formatCurrency(metrics.escrowReleased, reportingCurrency) },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">{stat.label}</div>
              <div className="text-2xl font-black text-gray-900 mt-2">{stat.value}</div>
              {stat.label === "Total volume" && (
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
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <div className="p-6 border-b border-gray-100/60">
            <h3 className="text-lg font-black text-gray-900">Recent payments</h3>
          </div>
          <CardContent className="p-6 space-y-4">
            {orders.slice(0, 8).map((o) => (
              <div key={o.id} className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-black text-gray-900">{o.id}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Method <span className="font-semibold text-gray-700">{o.paymentMethod}</span>{" "}
                    {o.paymentType && (
                      <>
                        • Type <span className="font-semibold text-gray-700">{o.paymentType}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Amount</div>
                  {(() => {
                    const originalAmount = o.originalAmount ?? o.totalAmount ?? 0;
                    const originalCurrency = (o.originalCurrency ?? defaultCurrency()) as CurrencyCode;
                    const converted =
                      ratesUsd && originalCurrency !== reportingCurrency
                        ? convertCurrency(originalAmount, originalCurrency, reportingCurrency, ratesUsd).convertedAmount
                        : null;
                    return (
                      <div className="text-sm font-black text-gray-900">
                        {formatCurrency(originalAmount, originalCurrency)}
                        {converted !== null ? (
                          <div className="text-[11px] font-semibold text-gray-500 mt-1">≈ {formatCurrency(converted, reportingCurrency)}</div>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <div className="p-6 border-b border-gray-100/60">
            <h3 className="text-lg font-black text-gray-900">By payment type</h3>
          </div>
          <CardContent className="p-6 space-y-3">
            {Object.entries(metrics.byType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  {type === "escrow" ? <ShieldCheck className="w-4 h-4 text-primary-700" /> : <Banknote className="w-4 h-4 text-gray-500" />}
                  {type}
                </div>
                <div className="text-sm font-black text-gray-900">{count}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
