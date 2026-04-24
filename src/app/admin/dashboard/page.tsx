"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { seedOrdersIfEmpty } from "@/services/orderStore";
import { useExchangeRatesUsd } from "@/services/exchangeRateService";
import { SUPPORTED_CURRENCIES, convertCurrency, formatCurrency } from "@/utils/currencyConverter";
import { type CurrencyCode, type Order } from "@/types";
import { listCustomers, listMerchants } from "@/services/adminService";
import { hasMultipleFailedAuthAttempts } from "@/services/authStore";
import { AlertTriangle, Banknote, FileText, Gavel, ShieldCheck, Store, Users } from "lucide-react";

const defaultCurrency = (): CurrencyCode => {
  const raw = (process.env.NEXT_PUBLIC_DEFAULT_CURRENCY as CurrencyCode | undefined) ?? "SAR";
  return SUPPORTED_CURRENCIES.includes(raw) ? raw : "SAR";
};

export default function AdminDashboardPage() {
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

  const totalGmv = useMemo(() => {
    if (!ratesUsd) return orders.reduce((sum, o) => sum + (o.originalAmount ?? o.totalAmount ?? 0), 0);
    return orders.reduce((sum, o) => {
      const originalAmount = o.originalAmount ?? o.totalAmount ?? 0;
      const originalCurrency = (o.originalCurrency ?? defaultCurrency()) as CurrencyCode;
      return sum + convertCurrency(originalAmount, originalCurrency, reportingCurrency, ratesUsd).convertedAmount;
    }, 0);
  }, [orders, ratesUsd, reportingCurrency]);

  const summary = useMemo(() => {
    const merchants = listMerchants({ status: "all" });
    const customers = listCustomers({ status: "all" });
    const lcOrders = orders.filter((o) => o.paymentType === "lc" || o.paymentMethod === "LC");
    const escrowOrders = orders.filter((o) => o.paymentType === "escrow" || o.paymentMethod === "ESCROW");

    let disputes = 0;
    let openDisputes = 0;
    try {
      const raw = window.localStorage.getItem("msquare.disputes.v1");
      if (raw) {
        const parsed = JSON.parse(raw) ?? {};
        disputes = Object.keys(parsed).length;
        openDisputes = Object.values(parsed).filter((d: any) => String(d?.status ?? "").toUpperCase() !== "RESOLVED").length;
      }
    } catch {}

    const totalMerchants = merchants.length;
    const activeMerchants = merchants.filter((m) => m.status === "approved").length;
    const totalOrders = orders.length;
    const escrowTransactions = escrowOrders.length;
    const lcRequests = lcOrders.length;
    const complianceAlerts =
      merchants.filter((m) => (m.restrictionLevel ?? "warning") !== "warning" || Boolean(m.complianceHold)).length +
      customers.filter((c) => (c.restrictionLevel ?? "warning") !== "warning" || Boolean(c.complianceHold)).length;

    const largeOrderAmount = orders.filter((o) => (o.totalAmount ?? 0) >= 50000).length;
    const failedAttempts =
      merchants.filter((m) => hasMultipleFailedAuthAttempts(m.email)).length +
      customers.filter((c) => hasMultipleFailedAuthAttempts(c.email)).length;
    const missingDocuments = merchants.filter((m) => !m.riskChecks.documentsUploaded).length;

    return {
      totalMerchants,
      activeMerchants,
      totalOrders,
      totalGmv,
      escrowTransactions,
      lcRequests,
      disputes,
      openDisputes,
      complianceAlerts,
      largeOrderAmount,
      failedAttempts,
      missingDocuments,
    };
  }, [orders, totalGmv]);

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500">Monitor merchants, trade assurance, payments, and LC activity.</p>
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
            Platform control
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Total merchants", value: String(summary.totalMerchants), icon: <Store className="w-5 h-5" />, href: "/admin/merchants" },
          { label: "Active merchants", value: String(summary.activeMerchants), icon: <ShieldCheck className="w-5 h-5" />, href: "/admin/merchants" },
          { label: "Total orders", value: String(summary.totalOrders), icon: <ShieldCheck className="w-5 h-5" />, href: "/admin/orders" },
          { label: "Total GMV", value: formatCurrency(summary.totalGmv, reportingCurrency), icon: <Banknote className="w-5 h-5" />, href: "/admin/payments" },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:shadow-sm transition-all">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-700">
                  {stat.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{stat.label}</div>
                  <div className="text-xl font-black text-gray-900 mt-1 truncate">{stat.value}</div>
                  {stat.label === "Total GMV" && (
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
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Escrow transactions", value: String(summary.escrowTransactions), icon: <ShieldCheck className="w-5 h-5" />, href: "/admin/orders" },
          { label: "LC requests", value: String(summary.lcRequests), icon: <FileText className="w-5 h-5" />, href: "/admin/lc-requests" },
          { label: "Open disputes", value: String(summary.openDisputes), icon: <Gavel className="w-5 h-5" />, href: "/admin/disputes" },
          { label: "Compliance alerts", value: String(summary.complianceAlerts), icon: <AlertTriangle className="w-5 h-5" />, href: "/admin/compliance" },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:shadow-sm transition-all">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-700">
                  {stat.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{stat.label}</div>
                  <div className="text-xl font-black text-gray-900 mt-1 truncate">{stat.value}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mb-10 flex flex-wrap gap-3">
        {[
          { label: "Large orders", value: summary.largeOrderAmount, href: "/admin/orders" },
          { label: "Failed attempts", value: summary.failedAttempts, href: "/admin/merchants" },
          { label: "Missing documents", value: summary.missingDocuments, href: "/admin/merchants" },
        ].map((flag) => (
          <Link
            key={flag.label}
            href={flag.href}
            className="inline-flex items-center gap-2 rounded-full border border-amber-200/70 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100/60 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            {flag.label}: <span className="font-black">{flag.value}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <div className="p-6 border-b border-gray-100/60 flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900">Quick links</h3>
          </div>
          <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: "All merchants", desc: "View verified suppliers and performance.", icon: <Users className="w-5 h-5" />, href: "/admin/merchants" },
              { title: "Customers", desc: "Review customer accounts and suspensions.", icon: <Users className="w-5 h-5" />, href: "/admin/customers" },
              { title: "All orders", desc: "Audit trade assurance order lifecycle.", icon: <ShieldCheck className="w-5 h-5" />, href: "/admin/orders" },
              { title: "Disputes", desc: "Review buyer disputes and outcomes.", icon: <Gavel className="w-5 h-5" />, href: "/admin/disputes" },
              { title: "LC requests", desc: "Track LC requests, docs, and status.", icon: <FileText className="w-5 h-5" />, href: "/admin/lc-requests" },
            ].map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="rounded-2xl border border-gray-200/60 bg-white p-5 hover:border-primary-200/70 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary-50 border border-primary-200/60 flex items-center justify-center text-primary-700">
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black text-gray-900">{item.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <div className="p-6 border-b border-gray-100/60">
            <h3 className="text-lg font-black text-gray-900">Disputes snapshot</h3>
          </div>
          <CardContent className="p-6">
            <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Open / submitted</div>
              <div className="text-2xl font-black text-gray-900 mt-1">{summary.openDisputes}</div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Disputes are currently stored in local state for the demo and are visible in the disputes page.
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
