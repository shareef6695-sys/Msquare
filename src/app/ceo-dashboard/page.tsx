"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { mockCEOStats, type ExecutiveRole } from "@/data/mockCEOStats";
import { logoutExecutive, requireExecutive } from "@/services/executiveAuthService";
import { BarChart3, BriefcaseBusiness, FileText, FlagTriangleRight, LineChart, LogOut, ShieldAlert, Users } from "lucide-react";

type ExecNavKey = "dashboard" | "financials" | "sales" | "risk" | "reports";

const NAV: Array<{ key: ExecNavKey; label: string; icon: React.ReactNode }> = [
  { key: "dashboard", label: "Dashboard", icon: <LineChart className="w-4 h-4" /> },
  { key: "financials", label: "Financials", icon: <BriefcaseBusiness className="w-4 h-4" /> },
  { key: "sales", label: "Sales", icon: <Users className="w-4 h-4" /> },
  { key: "risk", label: "Risk & Compliance", icon: <ShieldAlert className="w-4 h-4" /> },
  { key: "reports", label: "Reports", icon: <FileText className="w-4 h-4" /> },
];

const isExecNavKey = (v: string | null): v is ExecNavKey => {
  if (!v) return false;
  return (NAV as any).some((x: any) => x.key === v);
};

const roleLabel = (r: ExecutiveRole) => {
  if (r === "ceo") return "CEO";
  if (r === "managing_director") return "Managing Director";
  if (r === "finance_manager") return "Finance Manager";
  if (r === "sales_manager") return "Sales Manager";
  return "General Manager";
};

const formatSar = (v: number) => {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(v);
};

const badge = (severity: "low" | "medium" | "high" | "critical") => {
  if (severity === "critical") return "border-red-200/70 bg-red-50 text-red-800";
  if (severity === "high") return "border-amber-200/70 bg-amber-50 text-amber-900";
  if (severity === "medium") return "border-blue-200/70 bg-blue-50 text-blue-800";
  return "border-gray-200/70 bg-gray-50 text-gray-700";
};

const TrendBars = ({
  title,
  series,
  value,
  formatValue,
}: {
  title: string;
  series: Array<{ label: string; value: number }>;
  value?: string;
  formatValue?: (n: number) => string;
}) => {
  const max = Math.max(1, ...series.map((s) => s.value));
  return (
    <div className="rounded-3xl border border-gray-200/60 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-black text-gray-900">{title}</div>
          <div className="text-xs text-gray-500 mt-1">Last 6 months (mock)</div>
        </div>
        {value ? <div className="text-sm font-black text-gray-900">{value}</div> : null}
      </div>
      <div className="mt-5 grid grid-cols-6 gap-3 items-end">
        {series.map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-2">
            <div className="w-full h-28 rounded-2xl bg-gray-100 overflow-hidden flex items-end">
              <div className="w-full rounded-2xl bg-primary-600" style={{ height: `${Math.max(6, (s.value / max) * 100)}%` }} />
            </div>
            <div className="text-[11px] font-bold text-gray-500">{s.label}</div>
            {formatValue ? <div className="text-[11px] font-black text-gray-700">{formatValue(s.value)}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
};

const DistBars = ({ title, rows }: { title: string; rows: Array<{ label: string; value: number; hint?: string }> }) => {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="rounded-3xl border border-gray-200/60 bg-white p-6">
      <div className="text-sm font-black text-gray-900">{title}</div>
      <div className="text-xs text-gray-500 mt-1">Distribution (mock)</div>
      <div className="mt-5 space-y-3">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm font-semibold text-gray-800">{r.label}</div>
              <div className="text-xs font-black text-gray-700">{r.hint ?? ""}</div>
            </div>
            <div className="mt-2 h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-primary-600" style={{ width: `${Math.max(4, (r.value / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const allowedForRole = (role: ExecutiveRole): Record<ExecNavKey, boolean> => {
  if (role === "ceo" || role === "managing_director") return { dashboard: true, financials: true, sales: true, risk: true, reports: true };
  if (role === "finance_manager") return { dashboard: true, financials: true, sales: false, risk: true, reports: true };
  if (role === "sales_manager") return { dashboard: true, financials: false, sales: true, risk: false, reports: true };
  return { dashboard: true, financials: false, sales: false, risk: true, reports: true };
};

export default function CeoDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 pt-24 pb-20" />}>
      <CeoDashboardContent />
    </Suspense>
  );
}

function CeoDashboardContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const [role, setRole] = useState<ExecutiveRole | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const view = isExecNavKey(sp.get("view")) ? (sp.get("view") as ExecNavKey) : "dashboard";

  useEffect(() => {
    const r = requireExecutive();
    if (!r.ok) {
      router.replace("/ceo-dashboard/login");
      return;
    }
    setRole(r.session.user.role);
    setEmail(r.session.user.email);
    setReady(true);
  }, [router]);

  const perms = useMemo(() => (role ? allowedForRole(role) : allowedForRole("gm")), [role]);

  const navItems = useMemo(() => NAV.filter((n) => perms[n.key]), [perms]);

  useEffect(() => {
    if (!perms[view]) {
      const first = navItems[0]?.key ?? "dashboard";
      router.replace(`/ceo-dashboard?view=${first}`);
    }
  }, [navItems, perms, router, view]);

  const k = mockCEOStats.kpis;
  const trends = mockCEOStats.trends;

  const gmvSeries = useMemo(() => trends.map((t) => ({ label: t.month, value: t.gmvSar })), [trends]);
  const revSeries = useMemo(() => trends.map((t) => ({ label: t.month, value: t.revenueSar })), [trends]);
  const ordSeries = useMemo(() => trends.map((t) => ({ label: t.month, value: t.orders })), [trends]);
  const merchSeries = useMemo(() => trends.map((t) => ({ label: t.month, value: t.merchants })), [trends]);

  const categoryRows = useMemo(() => {
    return mockCEOStats.categoryDistribution
      .slice()
      .sort((a, b) => b.gmvSar - a.gmvSar)
      .slice(0, 6)
      .map((c) => ({ label: c.category, value: c.gmvSar, hint: formatSar(c.gmvSar) }));
  }, []);

  const kpiCards = useMemo(() => {
    const cards = [
      { key: "gmv", label: "Total GMV", value: formatSar(k.totalGmvSar), icon: <BarChart3 className="w-5 h-5" /> },
      { key: "rev", label: "Total Revenue", value: formatSar(k.totalRevenueSar), icon: <LineChart className="w-5 h-5" /> },
      { key: "merch", label: "Active Merchants", value: new Intl.NumberFormat("en-US").format(k.activeMerchants), icon: <Users className="w-5 h-5" /> },
      { key: "ordersToday", label: "Orders Today", value: new Intl.NumberFormat("en-US").format(k.ordersToday), icon: <BriefcaseBusiness className="w-5 h-5" /> },
      { key: "payouts", label: "Pending Payouts", value: formatSar(k.pendingPayoutsSar), icon: <FlagTriangleRight className="w-5 h-5" /> },
      { key: "escrow", label: "Escrow Balance", value: formatSar(k.escrowBalanceSar), icon: <ShieldAlert className="w-5 h-5" /> },
      { key: "lc", label: "LC Transactions", value: formatSar(k.lcTransactionsSar), icon: <FileText className="w-5 h-5" /> },
      { key: "disputes", label: "Disputes", value: new Intl.NumberFormat("en-US").format(k.openDisputes), icon: <ShieldAlert className="w-5 h-5" /> },
    ];

    if (role === "finance_manager") {
      return cards.filter((c) => ["rev", "payouts", "escrow", "lc", "gmv"].includes(c.key));
    }
    if (role === "sales_manager") {
      return cards.filter((c) => ["merch", "ordersToday", "gmv", "rev"].includes(c.key));
    }
    if (role === "gm") {
      return cards.filter((c) => ["ordersToday", "disputes", "merch"].includes(c.key));
    }
    return cards;
  }, [k.activeMerchants, k.escrowBalanceSar, k.lcTransactionsSar, k.openDisputes, k.ordersToday, k.pendingPayoutsSar, k.totalGmvSar, k.totalRevenueSar, role]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-20">
      <div className="container-max">
        <div className="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-widest text-gray-400">Executive</div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">CEO / Executive Dashboard</h1>
            <div className="text-sm text-gray-500 mt-1">
              {role ? roleLabel(role) : "—"} • {email ?? "—"} • Updated {new Date(mockCEOStats.updatedAt).toLocaleString()}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/" className="hidden sm:block">
              <Button variant="outline">Back to MSquare</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                logoutExecutive();
                router.replace("/ceo-dashboard/login");
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          <aside className="w-full space-y-4 lg:sticky lg:top-24 self-start">
            <div className="rounded-3xl border border-gray-200/60 bg-white p-4 shadow-sm shadow-gray-900/5">
              <div className="text-sm font-black text-gray-900 px-2 py-2">Navigation</div>
              <div className="mt-2 space-y-1">
                {navItems.map((n) => {
                  const active = n.key === view;
                  return (
                    <Link
                      key={n.key}
                      href={`/ceo-dashboard?view=${n.key}`}
                      className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                        active ? "bg-primary-50 text-primary-800 border border-primary-200/70" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={active ? "text-primary-700" : "text-gray-500"}>{n.icon}</span>
                        {n.label}
                      </div>
                      <span className={`text-[11px] font-black ${active ? "text-primary-700" : "text-gray-400"}`}>{active ? "LIVE" : ""}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200/60 bg-white p-6 shadow-sm shadow-gray-900/5">
              <div className="text-sm font-black text-gray-900">Quick alerts</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400">High-risk</div>
                  <div className="text-lg font-black text-gray-900 mt-1">{k.highRiskTransactions}</div>
                </div>
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Expired docs</div>
                  <div className="text-lg font-black text-gray-900 mt-1">{k.expiredDocuments}</div>
                </div>
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Failed pay</div>
                  <div className="text-lg font-black text-gray-900 mt-1">{k.failedPayments}</div>
                </div>
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Refunds</div>
                  <div className="text-lg font-black text-gray-900 mt-1">{formatSar(k.refundsSar)}</div>
                </div>
              </div>
            </div>
          </aside>

          <main className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {kpiCards.map((c) => (
                <Card key={c.key}>
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-700">
                      {c.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{c.label}</div>
                      <div className="text-xl font-black text-gray-900 mt-1">{c.value}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {(view === "dashboard" || view === "financials") && perms.financials && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <TrendBars title="GMV trend" series={gmvSeries} value={formatSar(k.totalGmvSar)} formatValue={(n) => formatSar(n).replace("SAR", "").trim()} />
                <TrendBars
                  title="Revenue trend"
                  series={revSeries}
                  value={formatSar(k.totalRevenueSar)}
                  formatValue={(n) => formatSar(n).replace("SAR", "").trim()}
                />
              </div>
            )}

            {(view === "dashboard" || view === "sales") && perms.sales && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <TrendBars title="Orders trend" series={ordSeries} formatValue={(n) => new Intl.NumberFormat("en-US").format(n)} />
                <TrendBars title="Merchant growth" series={merchSeries} formatValue={(n) => new Intl.NumberFormat("en-US").format(n)} />
              </div>
            )}

            {(view === "dashboard" || view === "reports") && perms.reports && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <DistBars title="Category sales distribution" rows={categoryRows} />
                <div className="rounded-3xl border border-gray-200/60 bg-white p-6">
                  <div className="text-sm font-black text-gray-900">Top lists</div>
                  <div className="text-xs text-gray-500 mt-1">Key performers (mock)</div>
                  <div className="mt-5 space-y-4">
                    <div>
                      <div className="text-xs font-black uppercase tracking-widest text-gray-400">Top merchants</div>
                      <div className="mt-3 space-y-2">
                        {mockCEOStats.topMerchants.slice(0, 5).map((m) => (
                          <div key={m.merchantId} className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="text-sm font-black text-gray-900">{m.name}</div>
                                <div className="text-xs text-gray-500 mt-1">{new Intl.NumberFormat("en-US").format(m.orders)} orders</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-black text-gray-900">{formatSar(m.gmvSar)}</div>
                                <div
                                  className={`mt-2 inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black ${
                                    m.risk === "high"
                                      ? "border-red-200/70 bg-red-50 text-red-800"
                                      : m.risk === "medium"
                                        ? "border-amber-200/70 bg-amber-50 text-amber-900"
                                        : "border-green-200/70 bg-green-50 text-green-800"
                                  }`}
                                >
                                  Risk {m.risk.toUpperCase()}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-black uppercase tracking-widest text-gray-400">Top products</div>
                      <div className="mt-3 space-y-2">
                        {mockCEOStats.topProducts.slice(0, 4).map((p) => (
                          <div key={p.productId} className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="text-sm font-black text-gray-900">{p.name}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {p.merchantName} • {p.category} • {new Intl.NumberFormat("en-US").format(p.orders)} orders
                                </div>
                              </div>
                              <div className="text-sm font-black text-gray-900">{formatSar(p.gmvSar)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(view === "dashboard" || view === "risk") && perms.risk && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="rounded-3xl border border-gray-200/60 bg-white p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-black text-gray-900">Alerts</div>
                      <div className="text-xs text-gray-500 mt-1">Risk, disputes, failed payments, documents (mock)</div>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200/60 bg-gray-50 px-4 py-2 text-xs font-black text-gray-700">
                      <ShieldAlert className="w-4 h-4" />
                      {mockCEOStats.alerts.length} alerts
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {mockCEOStats.alerts.slice(0, 6).map((a) => (
                      <div key={a.id} className="rounded-3xl border border-gray-200/60 bg-white p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="text-sm font-black text-gray-900">{a.title}</div>
                            <div className="text-sm text-gray-600 mt-1">{a.detail}</div>
                            <div className="text-[11px] text-gray-500 mt-2">{new Date(a.createdAt).toLocaleString()}</div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black ${badge(a.severity)}`}>
                              {a.severity.toUpperCase()}
                            </span>
                            <div className="mt-2 text-[11px] font-bold text-gray-500">{a.type.replaceAll("_", " ")}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-200/60 bg-white p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-black text-gray-900">Risk summary</div>
                      <div className="text-xs text-gray-500 mt-1">Compliance and transaction health (mock)</div>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-800">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    {[
                      { label: "High-risk tx", value: String(k.highRiskTransactions) },
                      { label: "Expired docs", value: String(k.expiredDocuments) },
                      { label: "Failed payments", value: String(k.failedPayments) },
                      { label: "Open disputes", value: String(k.openDisputes) },
                    ].map((x) => (
                      <div key={x.label} className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                        <div className="text-xs font-bold uppercase tracking-widest text-gray-400">{x.label}</div>
                        <div className="text-xl font-black text-gray-900 mt-1">{x.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm text-gray-600 flex items-start gap-3">
                    <ShieldAlert className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div>
                      Executive dashboard is mock-only and does not trigger approvals, payouts, or compliance decisions.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {view === "financials" && perms.financials && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                  <div className="p-6 border-b border-gray-100/60">
                    <div className="text-lg font-black text-gray-900">Finance snapshot</div>
                    <div className="text-sm text-gray-500 mt-1">Revenue, escrow, payouts, LC, refunds.</div>
                  </div>
                  <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: "Total revenue", value: formatSar(k.totalRevenueSar) },
                      { label: "Escrow balance", value: formatSar(k.escrowBalanceSar) },
                      { label: "Pending payouts", value: formatSar(k.pendingPayoutsSar) },
                      { label: "LC transactions", value: formatSar(k.lcTransactionsSar) },
                      { label: "Refunds", value: formatSar(k.refundsSar) },
                      { label: "Failed payments", value: String(k.failedPayments) },
                    ].map((x) => (
                      <div key={x.label} className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                        <div className="text-xs font-bold uppercase tracking-widest text-gray-400">{x.label}</div>
                        <div className="text-lg font-black text-gray-900 mt-1">{x.value}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <DistBars
                  title="Top categories by GMV"
                  rows={mockCEOStats.topCategories.slice(0, 5).map((c) => ({
                    label: `${c.category} (+${c.growthPct.toFixed(1)}%)`,
                    value: c.gmvSar,
                    hint: formatSar(c.gmvSar),
                  }))}
                />
              </div>
            )}

            {view === "sales" && perms.sales && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                  <div className="p-6 border-b border-gray-100/60">
                    <div className="text-lg font-black text-gray-900">Sales highlights</div>
                    <div className="text-sm text-gray-500 mt-1">Merchant growth, top merchants, sales momentum.</div>
                  </div>
                  <CardContent className="p-6 space-y-4">
                    {mockCEOStats.topMerchants.slice(0, 6).map((m) => (
                      <div key={m.merchantId} className="rounded-3xl border border-gray-200/60 bg-white p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="text-sm font-black text-gray-900">{m.name}</div>
                            <div className="text-xs text-gray-500 mt-1">{new Intl.NumberFormat("en-US").format(m.orders)} orders</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-gray-900">{formatSar(m.gmvSar)}</div>
                            <span className={`mt-2 inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black ${badge(m.risk === "high" ? "high" : m.risk === "medium" ? "medium" : "low")}`}>
                              Risk {m.risk.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <TrendBars title="Orders trend" series={ordSeries} formatValue={(n) => new Intl.NumberFormat("en-US").format(n)} />
                  <TrendBars title="Merchant growth" series={merchSeries} formatValue={(n) => new Intl.NumberFormat("en-US").format(n)} />
                </div>
              </div>
            )}

            {view === "reports" && perms.reports && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                  <div className="p-6 border-b border-gray-100/60">
                    <div className="text-lg font-black text-gray-900">Reports</div>
                    <div className="text-sm text-gray-500 mt-1">Quick export stubs (mock).</div>
                  </div>
                  <CardContent className="p-6 space-y-3">
                    {[
                      { label: "GMV report (monthly)", icon: <BarChart3 className="w-4 h-4" /> },
                      { label: "Revenue report", icon: <LineChart className="w-4 h-4" /> },
                      { label: "Merchant growth report", icon: <Users className="w-4 h-4" /> },
                      { label: "Risk & compliance report", icon: <ShieldAlert className="w-4 h-4" /> },
                    ].map((r) => (
                      <button
                        key={r.label}
                        className="w-full text-left rounded-3xl border border-gray-200/60 bg-white px-5 py-4 hover:bg-gray-50 transition-colors"
                        onClick={() => window.alert("Mock: export report")}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-700">
                              {r.icon}
                            </div>
                            <div className="text-sm font-black text-gray-900">{r.label}</div>
                          </div>
                          <span className="text-xs font-black text-primary-700">EXPORT</span>
                        </div>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <div className="p-6 border-b border-gray-100/60">
                    <div className="text-lg font-black text-gray-900">Notes</div>
                    <div className="text-sm text-gray-500 mt-1">Scalable structure for future integration.</div>
                  </div>
                  <CardContent className="p-6 space-y-3 text-sm text-gray-700">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="w-4 h-4 text-gray-500 mt-0.5" />
                      <div>Role-based views restrict what each executive role can see.</div>
                    </div>
                    <div className="flex items-start gap-3">
                      <FlagTriangleRight className="w-4 h-4 text-gray-500 mt-0.5" />
                      <div>No automated payouts, approvals, or compliance decisions are made by this page.</div>
                    </div>
                    <div className="flex items-start gap-3">
                      <BarChart3 className="w-4 h-4 text-gray-500 mt-0.5" />
                      <div>Charts are UI-only and backed by <span className="font-semibold text-gray-900">mockCEOStats</span>.</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {view === "risk" && perms.risk && role === "gm" && (
              <Card>
                <div className="p-6 border-b border-gray-100/60">
                  <div className="text-lg font-black text-gray-900">GM focus</div>
                  <div className="text-sm text-gray-500 mt-1">Orders, disputes, compliance & document expiry alerts.</div>
                </div>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-3xl border border-gray-200/60 bg-white p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-black text-gray-900">Compliance alerts</div>
                        <div className="text-xs text-gray-500 mt-1">Expired documents and pending reviews</div>
                      </div>
                      <ShieldAlert className="w-5 h-5 text-amber-800" />
                    </div>
                    <div className="mt-4 text-2xl font-black text-gray-900">{k.expiredDocuments}</div>
                    <div className="mt-2 text-sm text-gray-600">Documents expired or expiring soon.</div>
                  </div>
                  <div className="rounded-3xl border border-gray-200/60 bg-white p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-black text-gray-900">Disputes</div>
                        <div className="text-xs text-gray-500 mt-1">Open disputes and escalations</div>
                      </div>
                      <ShieldAlert className="w-5 h-5 text-red-800" />
                    </div>
                    <div className="mt-4 text-2xl font-black text-gray-900">{k.openDisputes}</div>
                    <div className="mt-2 text-sm text-gray-600">Customer disputes requiring attention.</div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="rounded-3xl border border-gray-200/60 bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-black text-gray-900">Access control</div>
                  <div className="text-sm text-gray-500 mt-1">Only executive roles can access this dashboard.</div>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200/60 flex items-center justify-center text-red-700">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-700">
                Session is stored locally as <span className="font-semibold text-gray-900">msquare.exec.session.v1</span> (mock).
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/ceo-dashboard/login">
                  <Button variant="outline">Switch role</Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => {
                    logoutExecutive();
                    router.replace("/ceo-dashboard/login");
                  }}
                >
                  Clear session
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
