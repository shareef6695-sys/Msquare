"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MerchantLayout } from "@/features/merchant/MerchantLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { loadSession } from "@/services/authStore";
import { getMerchantById } from "@/services/adminService";
import { loadOrders, seedOrdersIfEmpty } from "@/services/orderStore";
import { useExchangeRatesUsd } from "@/services/exchangeRateService";
import { SUPPORTED_CURRENCIES, convertCurrency, formatCurrency } from "@/utils/currencyConverter";
import { type CurrencyCode, type Order } from "@/types";
import { CreditCard, ShieldCheck } from "lucide-react";

const defaultCurrency = (): CurrencyCode => {
  const raw = (process.env.NEXT_PUBLIC_DEFAULT_CURRENCY as CurrencyCode | undefined) ?? "SAR";
  return SUPPORTED_CURRENCIES.includes(raw) ? raw : "SAR";
};

export default function MerchantPaymentsPage() {
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>(defaultCurrency());
  const { loading: ratesLoading, result: ratesResult } = useExchangeRatesUsd();
  const ratesUsd = ratesResult?.ratesUsd;

  useEffect(() => {
    setOrders(seedOrdersIfEmpty());
    const session = loadSession();
    if (!session || session.user.role !== "MERCHANT") return;
    setMerchantId(session.user.merchantParentId ?? session.user.id);
    setOrders(loadOrders());
  }, []);

  useEffect(() => {
    if (!merchantId || typeof window === "undefined") return;
    const key = `msquare.currency.merchant.${merchantId}.v1`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    if (SUPPORTED_CURRENCIES.includes(raw as CurrencyCode)) setDisplayCurrency(raw as CurrencyCode);
  }, [merchantId]);

  const merchant = useMemo(() => (merchantId ? getMerchantById(merchantId) : null), [merchantId]);

  const myOrders = useMemo(() => {
    if (!merchantId) return [];
    return orders.filter((o) => o.merchantId === merchantId).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [merchantId, orders]);

  const escrowOrders = myOrders.filter((o) => o.paymentMethod === "ESCROW" || o.paymentType === "escrow");
  const convert = (o: Order) => {
    const originalAmount = o.originalAmount ?? o.totalAmount ?? 0;
    const originalCurrency = (o.originalCurrency ?? merchant?.sellingCurrency ?? defaultCurrency()) as CurrencyCode;
    if (!ratesUsd) return { displayAmount: originalAmount, originalAmount, originalCurrency, converted: null as number | null };
    const convertedAmount = convertCurrency(originalAmount, originalCurrency, displayCurrency, ratesUsd).convertedAmount;
    return {
      displayAmount: convertedAmount,
      originalAmount,
      originalCurrency,
      converted: originalCurrency !== displayCurrency ? convertedAmount : null,
    };
  };

  const totalGmv = myOrders.reduce((sum, o) => sum + convert(o).displayAmount, 0);
  const released = escrowOrders.filter((o) => o.payoutStatus === "RELEASED").reduce((sum, o) => sum + convert(o).displayAmount, 0);
  const onHold = escrowOrders.filter((o) => o.payoutStatus === "ON_HOLD").reduce((sum, o) => sum + convert(o).displayAmount, 0);

  return (
    <MerchantLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Payments</h1>
          <p className="text-gray-500">Escrow and payout status for your orders (mock).</p>
        </div>
        <Link href="/merchant/orders">
          <Button variant="outline">View orders</Button>
        </Link>
      </div>

      {merchant?.payoutHold && (
        <div className="mb-6 rounded-3xl border border-amber-200/70 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">
          Payout hold active: {merchant.payoutHoldReason ?? "Payouts are temporarily on hold due to compliance requirements."}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: "Total GMV", value: formatCurrency(totalGmv, displayCurrency), icon: <CreditCard className="w-5 h-5" /> },
          { label: "Released payouts", value: formatCurrency(released, displayCurrency), icon: <ShieldCheck className="w-5 h-5" /> },
          { label: "On-hold payouts", value: formatCurrency(onHold, displayCurrency), icon: <ShieldCheck className="w-5 h-5" /> },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-700">
                {s.icon}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{s.label}</div>
                <div className="text-xl font-black text-gray-900 mt-1 truncate">{s.value}</div>
                {s.label === "Total GMV" && (
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
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <div className="p-6 border-b border-gray-100/60">
          <div className="text-lg font-black text-gray-900">Payouts by order</div>
        </div>
        <CardContent className="p-6">
          {escrowOrders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
              <div className="text-lg font-black text-gray-900">No escrow orders yet</div>
              <div className="text-sm text-gray-500 mt-2">Escrow orders appear after customer checkout.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {escrowOrders.slice(0, 25).map((o) => (
                <Link
                  key={o.id}
                  href={`/merchant/orders/${o.id}`}
                  className="block rounded-3xl border border-gray-200/60 bg-white p-5 hover:shadow-sm transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-gray-900">{o.id}</div>
                      <div className="text-xs text-gray-500 mt-1">{o.createdAt} • {o.items.length} items</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center rounded-full border border-gray-200/70 bg-gray-50 px-3 py-1 text-xs font-black text-gray-700">
                        {o.escrowStatus ?? "—"}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-gray-200/70 bg-gray-50 px-3 py-1 text-xs font-black text-gray-700">
                        Payout {o.payoutStatus ?? "—"}
                      </span>
                      {(() => {
                        const originalAmount = o.originalAmount ?? o.totalAmount ?? 0;
                        const originalCurrency = (o.originalCurrency ?? merchant?.sellingCurrency ?? defaultCurrency()) as CurrencyCode;
                        const converted =
                          ratesUsd && originalCurrency !== displayCurrency
                            ? convertCurrency(originalAmount, originalCurrency, displayCurrency, ratesUsd).convertedAmount
                            : null;
                        return (
                          <div className="text-sm font-black text-gray-900">
                            {formatCurrency(originalAmount, originalCurrency)}
                            {converted !== null ? ` ≈ ${formatCurrency(converted, displayCurrency)}` : ""}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </MerchantLayout>
  );
}
