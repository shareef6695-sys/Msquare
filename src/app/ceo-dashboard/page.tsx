"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { mockCEOStats, type ExecutiveRole } from "@/data/mockCEOStats";
import { requireExecutive } from "@/services/executiveAuthService";
import {
  DEFAULT_EXEC_FILTERS,
  createMockDrilldownRows,
  getMockExecutiveAnalytics,
  type ExecutiveBusinessType,
  type ExecutiveCurrency,
  type ExecutiveDateRange,
  type ExecutiveFilters,
  type ExecutiveRegion,
  type MerchantStatus,
} from "@/data/mockExecutiveAnalytics";
import { ChartSwitcher, type ChartSettings, type ExecutiveChartType } from "@/components/executive/ChartSwitcher";
import { formatCurrency } from "@/utils/currencyConverter";
import {
  BarChart3,
  BriefcaseBusiness,
  FileText,
  Filter,
  FlagTriangleRight,
  LineChart,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";

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

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const ALL_CHART_TYPES: ExecutiveChartType[] = ["bar", "line", "area", "donut", "pie", "pyramid", "funnel", "stacked_bar", "radial"];

const badge = (severity: "low" | "medium" | "high" | "critical") => {
  if (severity === "critical") return "border-red-200/70 bg-red-50 text-red-800";
  if (severity === "high") return "border-amber-200/70 bg-amber-50 text-amber-900";
  if (severity === "medium") return "border-blue-200/70 bg-blue-50 text-blue-800";
  return "border-gray-200/70 bg-gray-50 text-gray-700";
};

const allowedForRole = (role: ExecutiveRole): Record<ExecNavKey, boolean> => {
  if (role === "ceo" || role === "managing_director") return { dashboard: true, financials: true, sales: true, risk: true, reports: true };
  if (role === "finance_manager") return { dashboard: true, financials: true, sales: false, risk: false, reports: true };
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
      router.replace("/login");
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

  const [filters, setFilters] = useState<ExecutiveFilters>(() => {
    if (typeof window === "undefined") return DEFAULT_EXEC_FILTERS;
    return safeJsonParse<ExecutiveFilters>(window.localStorage.getItem("msquare.exec.filters.v1"), DEFAULT_EXEC_FILTERS);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("msquare.exec.filters.v1", JSON.stringify(filters));
  }, [filters]);

  const analytics = useMemo(() => getMockExecutiveAnalytics(filters), [filters]);

  const displayCurrency = filters.currency;

  const convertSarValue = (sarAmount: number) => {
    if (displayCurrency === "SAR") return sarAmount;
    if (displayCurrency === "USD") return sarAmount * 0.2667;
    return sarAmount * 0.98;
  };

  const formatMoney = (sarAmount: number) => {
    const converted = convertSarValue(sarAmount);
    return formatCurrency(converted, displayCurrency);
  };

  const formatMaybeMoney = (value: number, kind: "money" | "count") => {
    if (kind === "count") return new Intl.NumberFormat("en-US").format(value);
    return formatMoney(value);
  };

  const openDisputes = useMemo(() => analytics.records.disputes.filter((d) => d.status !== "RESOLVED").length, [analytics.records.disputes]);
  const complianceAlerts = useMemo(() => analytics.records.complianceIssues.length, [analytics.records.complianceIssues.length]);

  const last = <T,>(arr: T[]) => arr[arr.length - 1];

  const kpi = useMemo(() => {
    const gmv = last(analytics.series.gmv)?.value ?? 0;
    const revenue = last(analytics.series.revenue)?.value ?? 0;
    const activeMerchants = last(analytics.series.activeMerchants)?.value ?? 0;
    const ordersToday = Math.max(0, Math.round(((last(analytics.series.orders)?.value ?? 0) / 30) * (filters.dateRange === "today" ? 1 : 1)));
    const escrow = last(analytics.series.escrowBalance)?.value ?? 0;
    const payouts = last(analytics.series.pendingPayouts)?.value ?? 0;
    const lc = last(analytics.series.lcTransactions)?.value ?? 0;
    return { gmv, revenue, activeMerchants, ordersToday, escrow, payouts, lc };
  }, [analytics.series.activeMerchants, analytics.series.escrowBalance, analytics.series.gmv, analytics.series.lcTransactions, analytics.series.orders, analytics.series.pendingPayouts, analytics.series.revenue, filters.dateRange]);

  const kpiCards = (() => {
    const cards = [
      { key: "gmv", label: "Total GMV", value: formatMaybeMoney(kpi.gmv, "money"), icon: <BarChart3 className="w-5 h-5" /> },
      { key: "rev", label: "Total Revenue", value: formatMaybeMoney(kpi.revenue, "money"), icon: <LineChart className="w-5 h-5" /> },
      { key: "merch", label: "Active Merchants", value: formatMaybeMoney(kpi.activeMerchants, "count"), icon: <Users className="w-5 h-5" /> },
      { key: "ordersToday", label: "Orders Today", value: formatMaybeMoney(kpi.ordersToday, "count"), icon: <BriefcaseBusiness className="w-5 h-5" /> },
      { key: "payouts", label: "Pending Payouts", value: formatMaybeMoney(kpi.payouts, "money"), icon: <FlagTriangleRight className="w-5 h-5" /> },
      { key: "escrow", label: "Escrow Balance", value: formatMaybeMoney(kpi.escrow, "money"), icon: <ShieldAlert className="w-5 h-5" /> },
      { key: "lc", label: "LC Transactions", value: formatMaybeMoney(kpi.lc, "money"), icon: <FileText className="w-5 h-5" /> },
      { key: "disputes", label: "Disputes", value: formatMaybeMoney(openDisputes, "count"), icon: <ShieldAlert className="w-5 h-5" /> },
    ];

    if (role === "finance_manager") return cards.filter((c) => ["gmv", "rev", "payouts", "escrow", "lc"].includes(c.key));
    if (role === "sales_manager") return cards.filter((c) => ["merch", "ordersToday"].includes(c.key));
    if (role === "gm") return cards.filter((c) => ["ordersToday", "disputes", "merch"].includes(c.key));
    return cards;
  })();

  const alertKpis = useMemo(() => {
    return {
      highRiskTransactions: mockCEOStats.kpis.highRiskTransactions,
      expiredDocuments: mockCEOStats.kpis.expiredDocuments,
      failedPayments: mockCEOStats.kpis.failedPayments,
      refundsSar: last(analytics.series.refunds)?.value ?? mockCEOStats.kpis.refundsSar,
    };
  }, [analytics.series.refunds]);

  const filterOptions = useMemo(() => {
    const categories = ["All", ...analytics.categories];
    return { categories };
  }, [analytics.categories]);

  const defaultChartSettings: ChartSettings = useMemo(
    () => ({
      showValues: true,
      showPercentage: false,
      comparePreviousPeriod: true,
      showLegend: true,
      showGridLines: true,
    }),
    [],
  );

  const [chartTypes, setChartTypes] = useState<Record<string, ExecutiveChartType>>(() => {
    if (typeof window === "undefined") return {};
    const raw = window.localStorage.getItem("msquare.exec.chartTypes.v1");
    const parsed = safeJsonParse<Record<string, ExecutiveChartType> | null>(raw, null);
    if (!parsed) return {};
    const cleaned: Record<string, ExecutiveChartType> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (ALL_CHART_TYPES.includes(v)) cleaned[k] = v;
    }
    return cleaned;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("msquare.exec.chartTypes.v1", JSON.stringify(chartTypes));
  }, [chartTypes]);

  const [chartSettings, setChartSettings] = useState<Record<string, ChartSettings>>(() => {
    if (typeof window === "undefined") return {};
    const raw = window.localStorage.getItem("msquare.exec.chartSettings.v1");
    const parsed = safeJsonParse<Record<string, Partial<ChartSettings>> | null>(raw, null);
    if (!parsed) return {};
    const cleaned: Record<string, ChartSettings> = {};
    for (const [k, v] of Object.entries(parsed)) cleaned[k] = { ...defaultChartSettings, ...(v ?? {}) };
    return cleaned;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("msquare.exec.chartSettings.v1", JSON.stringify(chartSettings));
  }, [chartSettings]);

  const [drill, setDrill] = useState<{ open: boolean; metric: string; clickedName?: string; rows: Array<{ id: string; primary: string; secondary: string; valueSar: number }> }>({
    open: false,
    metric: "Revenue",
    rows: [],
  });

  const moneyFormatter = (v: number) => formatCurrency(v, displayCurrency);
  const countFormatter = (v: number) => new Intl.NumberFormat("en-US").format(v);

  const getChartType = (id: string, fallback: ExecutiveChartType) => chartTypes[id] ?? fallback;
  const setChartType = (id: string, next: ExecutiveChartType) => setChartTypes((m) => ({ ...m, [id]: next }));
  const getSettings = (id: string) => chartSettings[id] ?? defaultChartSettings;
  const setSettings = (id: string, next: ChartSettings) => setChartSettings((m) => ({ ...m, [id]: next }));

  const openDrilldown = (metric: any, clickedName?: string) => {
    const rows = createMockDrilldownRows({ metric, analytics, clickedName });
    setDrill({ open: true, metric, clickedName, rows });
  };

  if (!ready) return null;

  return (
    <div>
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-widest text-gray-400">Executive</div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">CEO / Executive Dashboard</h1>
          <div className="text-sm text-gray-500 mt-1">
            {role ? roleLabel(role) : "—"} • {email ?? "—"} • Updated {new Date(mockCEOStats.updatedAt).toLocaleString()}
          </div>
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
                  <div className="text-lg font-black text-gray-900 mt-1">{alertKpis.highRiskTransactions}</div>
                </div>
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Expired docs</div>
                  <div className="text-lg font-black text-gray-900 mt-1">{alertKpis.expiredDocuments}</div>
                </div>
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Failed pay</div>
                  <div className="text-lg font-black text-gray-900 mt-1">{alertKpis.failedPayments}</div>
                </div>
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Refunds</div>
                  <div className="text-lg font-black text-gray-900 mt-1">{formatMoney(alertKpis.refundsSar)}</div>
                </div>
              </div>
            </div>
          </aside>

          <main className="space-y-8">
            <Card>
              <div className="p-6 border-b border-gray-100/60 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-700">
                    <Filter className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-lg font-black text-gray-900">Filters</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Drill-down analytics are mock-only. Currency conversion uses mock FX rates.
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => window.alert("Mock: Export Report")}>
                    Export Report
                  </Button>
                  <Button variant="outline" onClick={() => setFilters(DEFAULT_EXEC_FILTERS)}>
                    Reset
                  </Button>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                    <div className="text-[11px] font-black uppercase tracking-widest text-gray-400">Date range</div>
                    <select
                      value={filters.dateRange}
                      onChange={(e) => setFilters((f) => ({ ...f, dateRange: e.target.value as ExecutiveDateRange }))}
                      className="mt-1 w-full bg-transparent text-sm font-black text-gray-900 focus:outline-none"
                    >
                      <option value="today">Today</option>
                      <option value="7d">7 Days</option>
                      <option value="30d">30 Days</option>
                      <option value="6m">6 Months</option>
                      <option value="year">Year</option>
                    </select>
                  </div>

                  <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                    <div className="text-[11px] font-black uppercase tracking-widest text-gray-400">Region</div>
                    <select
                      value={filters.region}
                      onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value as ExecutiveRegion }))}
                      className="mt-1 w-full bg-transparent text-sm font-black text-gray-900 focus:outline-none"
                    >
                      <option>Saudi Arabia</option>
                      <option>UAE</option>
                      <option>GCC</option>
                      <option>Global</option>
                    </select>
                  </div>

                  <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                    <div className="text-[11px] font-black uppercase tracking-widest text-gray-400">Business type</div>
                    <select
                      value={filters.businessType}
                      onChange={(e) => setFilters((f) => ({ ...f, businessType: e.target.value as ExecutiveBusinessType }))}
                      className="mt-1 w-full bg-transparent text-sm font-black text-gray-900 focus:outline-none"
                    >
                      <option>B2B</option>
                      <option>B2C</option>
                      <option>Enterprise</option>
                    </select>
                  </div>

                  <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                    <div className="text-[11px] font-black uppercase tracking-widest text-gray-400">Currency</div>
                    <select
                      value={filters.currency}
                      onChange={(e) => setFilters((f) => ({ ...f, currency: e.target.value as ExecutiveCurrency }))}
                      className="mt-1 w-full bg-transparent text-sm font-black text-gray-900 focus:outline-none"
                    >
                      <option value="SAR">SAR</option>
                      <option value="USD">USD</option>
                      <option value="AED">AED</option>
                    </select>
                  </div>

                  <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                    <div className="text-[11px] font-black uppercase tracking-widest text-gray-400">Category</div>
                    <select
                      value={filters.category}
                      onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
                      className="mt-1 w-full bg-transparent text-sm font-black text-gray-900 focus:outline-none"
                    >
                      {filterOptions.categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                    <div className="text-[11px] font-black uppercase tracking-widest text-gray-400">Merchant status</div>
                    <select
                      value={filters.merchantStatus}
                      onChange={(e) => setFilters((f) => ({ ...f, merchantStatus: e.target.value as MerchantStatus | "all" }))}
                      className="mt-1 w-full bg-transparent text-sm font-black text-gray-900 focus:outline-none"
                    >
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="on_hold">On hold</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                <ChartSwitcher
                  title="GMV"
                  subtitle="Monthly GMV trend"
                  data={analytics.series.gmv.map((p) => ({ name: p.name, value: convertSarValue(p.value), prev: p.prev ? convertSarValue(p.prev) : undefined }))}
                  selectedChartType={getChartType("gmv", "area")}
                  onChartTypeChange={(t) => setChartType("gmv", t)}
                  availableChartTypes={ALL_CHART_TYPES}
                  settings={getSettings("gmv")}
                  onSettingsChange={(s) => setSettings("gmv", s)}
                  valueFormatter={moneyFormatter}
                  onSegmentClick={(x) => openDrilldown("GMV", x.name)}
                />

                <ChartSwitcher
                  title="Revenue"
                  subtitle="Monthly revenue trend"
                  data={analytics.series.revenue.map((p) => ({ name: p.name, value: convertSarValue(p.value), prev: p.prev ? convertSarValue(p.prev) : undefined }))}
                  selectedChartType={getChartType("revenue", "line")}
                  onChartTypeChange={(t) => setChartType("revenue", t)}
                  availableChartTypes={ALL_CHART_TYPES}
                  settings={getSettings("revenue")}
                  onSettingsChange={(s) => setSettings("revenue", s)}
                  valueFormatter={moneyFormatter}
                  onSegmentClick={(x) => openDrilldown("Revenue", x.name)}
                />
              </div>
            )}

            {(view === "dashboard" || view === "sales") && perms.sales && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ChartSwitcher
                  title="Orders"
                  subtitle="Order volume trend"
                  data={analytics.series.orders.map((p) => ({ name: p.name, value: p.value, prev: p.prev }))}
                  selectedChartType={getChartType("orders", "bar")}
                  onChartTypeChange={(t) => setChartType("orders", t)}
                  availableChartTypes={ALL_CHART_TYPES}
                  settings={getSettings("orders")}
                  onSettingsChange={(s) => setSettings("orders", s)}
                  valueFormatter={countFormatter}
                  onSegmentClick={(x) => openDrilldown("Orders", x.name)}
                />

                <ChartSwitcher
                  title="Merchant Growth"
                  subtitle="Active merchants trend"
                  data={analytics.series.activeMerchants.map((p) => ({ name: p.name, value: p.value, prev: p.prev }))}
                  selectedChartType={getChartType("activeMerchants", "line")}
                  onChartTypeChange={(t) => setChartType("activeMerchants", t)}
                  availableChartTypes={ALL_CHART_TYPES}
                  settings={getSettings("activeMerchants")}
                  onSettingsChange={(s) => setSettings("activeMerchants", s)}
                  valueFormatter={countFormatter}
                  onSegmentClick={(x) => openDrilldown("Active Merchants", x.name)}
                />
              </div>
            )}

            {(view === "dashboard" || view === "reports") && perms.reports && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ChartSwitcher
                  title="Category Sales Distribution"
                  subtitle="GMV by category"
                  data={analytics.distributions.salesByCategory.map((c) => ({ name: c.name, value: convertSarValue(c.value) }))}
                  selectedChartType={getChartType("salesByCategory", "donut")}
                  onChartTypeChange={(t) => setChartType("salesByCategory", t)}
                  availableChartTypes={ALL_CHART_TYPES}
                  settings={getSettings("salesByCategory")}
                  onSettingsChange={(s) => setSettings("salesByCategory", s)}
                  valueFormatter={moneyFormatter}
                />

                <Card className="overflow-hidden">
                  <div className="p-6 border-b border-gray-100/60">
                    <div className="text-lg font-black text-gray-900">Top Lists</div>
                    <div className="text-sm text-gray-500 mt-1">Key performers (mock)</div>
                  </div>
                  <CardContent className="p-6 space-y-4">
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
                                <div className="text-sm font-black text-gray-900">{formatMoney(m.gmvSar)}</div>
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
                              <div className="text-sm font-black text-gray-900">{formatMoney(p.gmvSar)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {(view === "dashboard" || view === "risk") && perms.risk && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ChartSwitcher
                  title="Disputes"
                  subtitle="Disputes by type"
                  data={analytics.distributions.disputesByType.map((d) => ({ name: d.name, value: d.value }))}
                  selectedChartType={getChartType("disputes", "donut")}
                  onChartTypeChange={(t) => setChartType("disputes", t)}
                  availableChartTypes={ALL_CHART_TYPES}
                  settings={getSettings("disputes")}
                  onSettingsChange={(s) => setSettings("disputes", s)}
                  valueFormatter={countFormatter}
                  onSegmentClick={(x) => openDrilldown("Disputes", x.name)}
                />

                <ChartSwitcher
                  title="Compliance Alerts"
                  subtitle="Issues by type"
                  data={analytics.distributions.complianceIssues.map((d) => ({ name: d.name, value: d.value }))}
                  selectedChartType={getChartType("compliance", "bar")}
                  onChartTypeChange={(t) => setChartType("compliance", t)}
                  availableChartTypes={ALL_CHART_TYPES}
                  settings={getSettings("compliance")}
                  onSettingsChange={(s) => setSettings("compliance", s)}
                  valueFormatter={countFormatter}
                  onSegmentClick={(x) => openDrilldown("Compliance Alerts", x.name)}
                />
              </div>
            )}

            {view === "financials" && perms.financials && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ChartSwitcher
                  title="Escrow Balance"
                  subtitle="Monthly escrow balance"
                  data={analytics.series.escrowBalance.map((p) => ({ name: p.name, value: convertSarValue(p.value), prev: p.prev ? convertSarValue(p.prev) : undefined }))}
                  selectedChartType={getChartType("escrow", "area")}
                  onChartTypeChange={(t) => setChartType("escrow", t)}
                  availableChartTypes={ALL_CHART_TYPES}
                  settings={getSettings("escrow")}
                  onSettingsChange={(s) => setSettings("escrow", s)}
                  valueFormatter={moneyFormatter}
                  onSegmentClick={(x) => openDrilldown("Escrow Balance", x.name)}
                />

                <ChartSwitcher
                  title="Pending Payouts"
                  subtitle="Monthly pending payouts"
                  data={analytics.series.pendingPayouts.map((p) => ({ name: p.name, value: convertSarValue(p.value), prev: p.prev ? convertSarValue(p.prev) : undefined }))}
                  selectedChartType={getChartType("payouts", "bar")}
                  onChartTypeChange={(t) => setChartType("payouts", t)}
                  availableChartTypes={ALL_CHART_TYPES}
                  settings={getSettings("payouts")}
                  onSettingsChange={(s) => setSettings("payouts", s)}
                  valueFormatter={moneyFormatter}
                  onSegmentClick={(x) => openDrilldown("Pending Payouts", x.name)}
                />

                <ChartSwitcher
                  title="LC Transactions"
                  subtitle="Monthly LC transaction volume"
                  data={analytics.series.lcTransactions.map((p) => ({ name: p.name, value: convertSarValue(p.value), prev: p.prev ? convertSarValue(p.prev) : undefined }))}
                  selectedChartType={getChartType("lc", "line")}
                  onChartTypeChange={(t) => setChartType("lc", t)}
                  availableChartTypes={ALL_CHART_TYPES}
                  settings={getSettings("lc")}
                  onSettingsChange={(s) => setSettings("lc", s)}
                  valueFormatter={moneyFormatter}
                  onSegmentClick={(x) => openDrilldown("LC Transactions", x.name)}
                />

                <ChartSwitcher
                  title="Refunds"
                  subtitle="Monthly refunds"
                  data={analytics.series.refunds.map((p) => ({ name: p.name, value: convertSarValue(p.value), prev: p.prev ? convertSarValue(p.prev) : undefined }))}
                  selectedChartType={getChartType("refunds", "bar")}
                  onChartTypeChange={(t) => setChartType("refunds", t)}
                  availableChartTypes={ALL_CHART_TYPES}
                  settings={getSettings("refunds")}
                  onSettingsChange={(s) => setSettings("refunds", s)}
                  valueFormatter={moneyFormatter}
                  onSegmentClick={(x) => openDrilldown("Refunds", x.name)}
                />
              </div>
            )}

            {view === "sales" && perms.sales && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ChartSwitcher
                  title="New Merchants"
                  subtitle="Monthly new merchants"
                  data={analytics.series.newMerchants.map((p) => ({ name: p.name, value: p.value, prev: p.prev }))}
                  selectedChartType={getChartType("newMerchants", "bar")}
                  onChartTypeChange={(t) => setChartType("newMerchants", t)}
                  availableChartTypes={ALL_CHART_TYPES}
                  settings={getSettings("newMerchants")}
                  onSettingsChange={(s) => setSettings("newMerchants", s)}
                  valueFormatter={countFormatter}
                  onSegmentClick={(x) => openDrilldown("New Merchants", x.name)}
                />

                <ChartSwitcher
                  title="Merchants by Region"
                  subtitle="Distribution by region"
                  data={analytics.distributions.merchantsByRegion.map((r) => ({ name: r.name, value: r.value }))}
                  selectedChartType={getChartType("merchantsByRegion", "pie")}
                  onChartTypeChange={(t) => setChartType("merchantsByRegion", t)}
                  availableChartTypes={ALL_CHART_TYPES}
                  settings={getSettings("merchantsByRegion")}
                  onSettingsChange={(s) => setSettings("merchantsByRegion", s)}
                  valueFormatter={countFormatter}
                />

                <ChartSwitcher
                  title="Orders by Status"
                  subtitle="Order status distribution"
                  data={analytics.distributions.ordersByStatus.map((s) => ({ name: s.name, value: s.value }))}
                  selectedChartType={getChartType("ordersByStatus", "donut")}
                  onChartTypeChange={(t) => setChartType("ordersByStatus", t)}
                  availableChartTypes={ALL_CHART_TYPES}
                  settings={getSettings("ordersByStatus")}
                  onSettingsChange={(s) => setSettings("ordersByStatus", s)}
                  valueFormatter={countFormatter}
                />

                <ChartSwitcher
                  title="Customer Growth"
                  subtitle="Monthly customer growth"
                  data={analytics.series.customerGrowth.map((p) => ({ name: p.name, value: p.value, prev: p.prev }))}
                  selectedChartType={getChartType("customerGrowth", "area")}
                  onChartTypeChange={(t) => setChartType("customerGrowth", t)}
                  availableChartTypes={ALL_CHART_TYPES}
                  settings={getSettings("customerGrowth")}
                  onSettingsChange={(s) => setSettings("customerGrowth", s)}
                  valueFormatter={countFormatter}
                  onSegmentClick={(x) => openDrilldown("Customer Growth", x.name)}
                />
              </div>
            )}

            {view === "risk" && perms.risk && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card className="overflow-hidden">
                  <div className="p-6 border-b border-gray-100/60 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-black text-gray-900">Alerts</div>
                      <div className="text-sm text-gray-500 mt-1">High-risk transactions, disputes, failed payments, documents (mock)</div>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200/60 bg-gray-50 px-4 py-2 text-xs font-black text-gray-700">
                      <ShieldAlert className="w-4 h-4" />
                      {mockCEOStats.alerts.length} alerts
                    </div>
                  </div>
                  <CardContent className="p-6 space-y-3">
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
                  </CardContent>
                </Card>

                <Card>
                  <div className="p-6 border-b border-gray-100/60">
                    <div className="text-lg font-black text-gray-900">Risk Summary</div>
                    <div className="text-sm text-gray-500 mt-1">Compliance and transaction health</div>
                  </div>
                  <CardContent className="p-6 grid grid-cols-2 gap-4">
                    {[
                      { label: "High-risk tx", value: String(alertKpis.highRiskTransactions) },
                      { label: "Expired docs", value: String(alertKpis.expiredDocuments) },
                      { label: "Failed payments", value: String(alertKpis.failedPayments) },
                      { label: "Open disputes", value: String(openDisputes) },
                      { label: "Compliance alerts", value: String(complianceAlerts) },
                      { label: "LC volume", value: formatMoney(kpi.lc) },
                    ].map((x) => (
                      <div key={x.label} className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                        <div className="text-xs font-bold uppercase tracking-widest text-gray-400">{x.label}</div>
                        <div className="text-lg font-black text-gray-900 mt-1">{x.value}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {view === "reports" && perms.reports && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ChartSwitcher
                  title="GMV (Monthly)"
                  subtitle="Report view"
                  data={analytics.series.gmv.map((p) => ({ name: p.name, value: convertSarValue(p.value), prev: p.prev ? convertSarValue(p.prev) : undefined }))}
                  selectedChartType={getChartType("gmv_report", "bar")}
                  onChartTypeChange={(t) => setChartType("gmv_report", t)}
                  availableChartTypes={ALL_CHART_TYPES}
                  settings={getSettings("gmv_report")}
                  onSettingsChange={(s) => setSettings("gmv_report", s)}
                  valueFormatter={moneyFormatter}
                  onSegmentClick={(x) => openDrilldown("GMV", x.name)}
                />

                <Card>
                  <div className="p-6 border-b border-gray-100/60">
                    <div className="text-lg font-black text-gray-900">Reports</div>
                    <div className="text-sm text-gray-500 mt-1">Quick export stubs (mock).</div>
                  </div>
                  <CardContent className="p-6 space-y-3">
                    {[
                      { label: "GMV report", icon: <BarChart3 className="w-4 h-4" /> },
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
                            <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-700">{r.icon}</div>
                            <div className="text-sm font-black text-gray-900">{r.label}</div>
                          </div>
                          <span className="text-xs font-black text-primary-700">EXPORT</span>
                        </div>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {drill.open && (
              <div className="fixed inset-0 z-[80]">
                <button className="absolute inset-0 bg-black/35" onClick={() => setDrill((d) => ({ ...d, open: false }))} />
                <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl shadow-gray-900/25 border-l border-gray-200/60 flex flex-col">
                  <div className="p-6 border-b border-gray-100/60 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-lg font-black text-gray-900">Drill-down: {drill.metric}</div>
                      <div className="text-sm text-gray-500 mt-1">{drill.clickedName ? `Selected: ${drill.clickedName}` : "Details behind this KPI (mock)"}</div>
                    </div>
                    <Button variant="outline" onClick={() => setDrill((d) => ({ ...d, open: false }))}>
                      <X className="w-4 h-4 mr-2" />
                      Close
                    </Button>
                  </div>
                  <div className="p-6 overflow-auto">
                    {drill.rows.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-600">No records</div>
                    ) : (
                      <div className="space-y-3">
                        {drill.rows.map((r) => (
                          <div key={r.id} className="rounded-3xl border border-gray-200/60 bg-white p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="text-sm font-black text-gray-900">{r.primary}</div>
                                <div className="text-sm text-gray-600 mt-1">{r.secondary}</div>
                              </div>
                              <div className="text-right text-sm font-black text-gray-900">
                                {["GMV", "Revenue", "Escrow Balance", "LC Transactions", "Pending Payouts", "Refunds"].includes(drill.metric)
                                  ? formatMoney(r.valueSar)
                                  : drill.metric === "Compliance Alerts"
                                    ? "—"
                                    : countFormatter(r.valueSar)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </main>
      </div>
    </div>
  );
}
