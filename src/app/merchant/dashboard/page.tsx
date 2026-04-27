"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MerchantLayout } from "@/features/merchant/MerchantLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { StatusPill } from "@/components/ui/StatusPill";
import { loadSession } from "@/services/authStore";
import { getMerchantById } from "@/services/adminService";
import { loadOrders, seedOrdersIfEmpty } from "@/services/orderStore";
import { listProducts } from "@/services/productService";
import { useExchangeRatesUsd } from "@/services/exchangeRateService";
import { SUPPORTED_CURRENCIES, convertCurrency, formatCurrency } from "@/utils/currencyConverter";
import { type CurrencyCode, type Order } from "@/types";
import { MOCK_CATEGORIES } from "@/data/mockCategories";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  Legend,
} from "recharts";
import { BarChart3, Boxes, MessageSquare, Package, ShoppingCart, TrendingUp } from "lucide-react";

const defaultCurrency = (): CurrencyCode => {
  const raw = (process.env.NEXT_PUBLIC_DEFAULT_CURRENCY as CurrencyCode | undefined) ?? "SAR";
  return SUPPORTED_CURRENCIES.includes(raw) ? raw : "SAR";
};

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (d: Date) => d.toLocaleString("en-US", { month: "short" });

export default function MerchantDashboardPage() {
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>(defaultCurrency());
  const { loading: ratesLoading, result: ratesResult } = useExchangeRatesUsd();
  const ratesUsd = ratesResult?.ratesUsd;

  useEffect(() => {
    seedOrdersIfEmpty();
    const session = loadSession();
    if (!session || session.user.role !== "MERCHANT") return;
    const id = session.user.merchantParentId ?? session.user.id;
    setMerchantId(id);
    setOrders(loadOrders());
  }, []);

  const merchant = useMemo(() => (merchantId ? getMerchantById(merchantId) : null), [merchantId]);

  useEffect(() => {
    if (!merchantId || typeof window === "undefined") return;
    const key = `msquare.currency.merchant.${merchantId}.v1`;
    const raw = window.localStorage.getItem(key);
    if (raw && SUPPORTED_CURRENCIES.includes(raw as CurrencyCode)) {
      setDisplayCurrency(raw as CurrencyCode);
      return;
    }
    const initial = (merchant?.sellingCurrency ?? defaultCurrency()) as CurrencyCode;
    setDisplayCurrency(initial);
  }, [merchant, merchantId]);

  useEffect(() => {
    if (!merchantId || typeof window === "undefined") return;
    const key = `msquare.currency.merchant.${merchantId}.v1`;
    window.localStorage.setItem(key, displayCurrency);
  }, [displayCurrency, merchantId]);

  const myOrders = useMemo(() => {
    if (!merchantId) return [];
    return orders.filter((o) => o.merchantId === merchantId);
  }, [merchantId, orders]);

  const myProducts = useMemo(() => {
    if (!merchantId) return [];
    return listProducts().filter((p) => p.merchantId === merchantId);
  }, [merchantId]);

  const totalOrders = myOrders.length;
  const totalSales = useMemo(() => {
    if (!ratesUsd) return myOrders.reduce((sum, o) => sum + (o.originalAmount ?? o.totalAmount ?? 0), 0);
    return myOrders.reduce((sum, o) => {
      const originalAmount = o.originalAmount ?? o.totalAmount ?? 0;
      const originalCurrency = (o.originalCurrency ?? merchant?.sellingCurrency ?? defaultCurrency()) as CurrencyCode;
      return sum + convertCurrency(originalAmount, originalCurrency, displayCurrency, ratesUsd).convertedAmount;
    }, 0);
  }, [displayCurrency, merchant?.sellingCurrency, myOrders, ratesUsd]);

  const openOrders = myOrders.filter((o) => ["PENDING", "PAID", "PROCESSING", "SHIPPED"].includes(o.status)).length;
  const lowStock = myProducts.filter((p) => (p.stock ?? 0) <= 10).length;

  const recentOrders = useMemo(() => {
    return [...myOrders].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, 8);
  }, [myOrders]);

  const categoryNameById = useMemo(() => {
    return Object.fromEntries(MOCK_CATEGORIES.map((c) => [c.id, c.name]));
  }, []);

  const salesByMonth = useMemo(() => {
    const end = new Date();
    const months: Array<{ key: string; label: string; value: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
      months.push({ key: monthKey(d), label: monthLabel(d), value: 0 });
    }
    const index = new Map(months.map((m) => [m.key, m]));
    myOrders.forEach((o) => {
      const created = new Date(o.createdAt);
      const k = monthKey(created);
      const bucket = index.get(k);
      if (!bucket) return;
      const originalAmount = o.originalAmount ?? o.totalAmount ?? 0;
      const originalCurrency = (o.originalCurrency ?? merchant?.sellingCurrency ?? defaultCurrency()) as CurrencyCode;
      const amount =
        ratesUsd && originalCurrency !== displayCurrency
          ? convertCurrency(originalAmount, originalCurrency, displayCurrency, ratesUsd).convertedAmount
          : originalAmount;
      bucket.value += amount;
    });
    return months;
  }, [displayCurrency, merchant?.sellingCurrency, myOrders, ratesUsd]);

  const orderStatus = useMemo(() => {
    const counts = new Map<string, number>();
    myOrders.forEach((o) => counts.set(o.status, (counts.get(o.status) ?? 0) + 1));
    const rows = Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
    const order = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
    rows.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
    return rows;
  }, [myOrders]);

  const inventoryByCategory = useMemo(() => {
    const sums = new Map<string, number>();
    myProducts.forEach((p) => {
      const name = categoryNameById[p.categoryId] ?? "Other";
      sums.set(name, (sums.get(name) ?? 0) + (p.stock ?? 0));
    });
    return Array.from(sums.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [categoryNameById, myProducts]);

  const topProducts = useMemo(() => {
    return [...myProducts].sort((a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0)).slice(0, 8);
  }, [myProducts]);

  const orderColumns: Array<DataTableColumn<Order>> = useMemo(
    () => [
      {
        key: "id",
        header: "Order",
        sortable: true,
        render: (o) => (
          <div className="min-w-0">
            <div className="font-black text-gray-900 truncate">{o.id}</div>
            <div className="text-xs font-semibold text-gray-500 truncate">{new Date(o.createdAt).toLocaleDateString()}</div>
          </div>
        ),
        value: (o) => o.id,
      },
      { key: "items", header: "Items", sortable: true, value: (o) => o.items.length },
      {
        key: "total",
        header: "Total",
        sortable: true,
        render: (o) => {
          const originalAmount = o.originalAmount ?? o.totalAmount ?? 0;
          const originalCurrency = (o.originalCurrency ?? merchant?.sellingCurrency ?? defaultCurrency()) as CurrencyCode;
          const amount =
            ratesUsd && originalCurrency !== displayCurrency
              ? convertCurrency(originalAmount, originalCurrency, displayCurrency, ratesUsd).convertedAmount
              : originalAmount;
          return <span className="font-black text-gray-900">{formatCurrency(amount, displayCurrency)}</span>;
        },
        value: (o) => {
          const originalAmount = o.originalAmount ?? o.totalAmount ?? 0;
          const originalCurrency = (o.originalCurrency ?? merchant?.sellingCurrency ?? defaultCurrency()) as CurrencyCode;
          return ratesUsd && originalCurrency !== displayCurrency
            ? convertCurrency(originalAmount, originalCurrency, displayCurrency, ratesUsd).convertedAmount
            : originalAmount;
        },
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        render: (o) => <StatusPill status={o.status} />,
        value: (o) => o.status,
      },
      {
        key: "paymentStatus",
        header: "Payment",
        sortable: true,
        render: (o) => <StatusPill status={o.paymentStatus} />,
        value: (o) => o.paymentStatus,
      },
      {
        key: "actions",
        header: "",
        render: (o) => (
          <Link href={`/merchant/orders/${o.id}`} className="text-primary-700 hover:text-primary-800 font-black">
            View
          </Link>
        ),
      },
    ],
    [displayCurrency, merchant?.sellingCurrency, ratesUsd],
  );

  return (
    <MerchantLayout>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Merchant Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Products, orders, inventory, analytics, and messages.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm shadow-gray-900/5">
            <div className="text-[11px] font-black uppercase tracking-widest text-gray-400">Currency</div>
            <select
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value as CurrencyCode)}
              className="mt-1 w-full bg-transparent text-sm font-black text-gray-900 focus:outline-none"
              disabled={!merchantId}
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <Link href="/merchant/products/new" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">Add product</Button>
          </Link>
          <Link href="/merchant/orders" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              View orders
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {[
          { label: "Total sales", value: formatCurrency(totalSales, displayCurrency), icon: <TrendingUp className="w-5 h-5" /> },
          { label: "Total orders", value: String(totalOrders), icon: <ShoppingCart className="w-5 h-5" /> },
          { label: "Active products", value: String(myProducts.length), icon: <Package className="w-5 h-5" /> },
          { label: "Open orders", value: String(openOrders), icon: <BarChart3 className="w-5 h-5" /> },
        ].map((s) => (
          <Card key={s.label} className="col-span-12 sm:col-span-6 lg:col-span-3">
            <CardContent className="p-4 sm:p-6 flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-700">
                {s.icon}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-widest text-gray-400">{s.label}</div>
                <div className="text-xl font-black text-gray-900 mt-1 truncate">{s.value}</div>
                {s.label === "Total sales" && (
                  <div className="text-[11px] text-gray-500 mt-1">
                    {ratesLoading ? (
                      <span>Loading exchange rate…</span>
                    ) : ratesResult ? (
                      <span>
                        Updated {new Date(ratesResult.updatedAt).toLocaleString()}
                        {ratesResult.usedFallback ? " • Using last available rate" : ""}
                        {ratesResult.stale ? " • May be outdated" : ""}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className="col-span-12 lg:col-span-8" id="analytics">
          <CardHeader className="p-4 sm:p-6 border-b border-gray-100/60">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-lg font-black text-gray-900 truncate">Sales trend</div>
                <div className="text-sm text-gray-500">Last 6 months • {displayCurrency}</div>
              </div>
              <Link href="/merchant/orders" className="text-sm font-black text-primary-700 hover:text-primary-800">
                Orders
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <Tooltip
                    formatter={(v: any) => formatCurrency(Number(v) || 0, displayCurrency)}
                    contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-12 lg:col-span-4">
          <CardHeader className="p-4 sm:p-6 border-b border-gray-100/60">
            <div className="text-lg font-black text-gray-900">Order status</div>
            <div className="text-sm text-gray-500">Distribution</div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }} />
                  <Legend verticalAlign="bottom" height={36} />
                  <Pie data={orderStatus} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {orderStatus.map((_, idx) => (
                      <Cell key={idx} fill={["#2563eb", "#f59e0b", "#10b981", "#0ea5e9", "#8b5cf6", "#ef4444"][idx % 6]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-12 lg:col-span-6">
          <CardHeader className="p-4 sm:p-6 border-b border-gray-100/60">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-lg font-black text-gray-900 truncate">Recent orders</div>
                <div className="text-sm text-gray-500">Sortable & searchable</div>
              </div>
              <Link href="/merchant/orders" className="text-sm font-black text-primary-700 hover:text-primary-800">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <DataTable
              rows={recentOrders}
              columns={orderColumns}
              getRowId={(o) => o.id}
              initialSort={{ key: "id", dir: "desc" }}
              searchPlaceholder="Search orders…"
            />
          </CardContent>
        </Card>

        <Card className="col-span-12 lg:col-span-6">
          <CardHeader className="p-4 sm:p-6 border-b border-gray-100/60">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-lg font-black text-gray-900 truncate">Top products</div>
                <div className="text-sm text-gray-500">By sales count</div>
              </div>
              <Link href="/merchant/products" className="text-sm font-black text-primary-700 hover:text-primary-800">
                Products
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <DataTable
              rows={topProducts}
              getRowId={(p) => p.id}
              searchPlaceholder="Search products…"
              initialSort={{ key: "sales", dir: "desc" }}
              columns={[
                {
                  key: "name",
                  header: "Product",
                  sortable: true,
                  render: (p: any) => (
                    <div className="min-w-0">
                      <div className="font-black text-gray-900 truncate">{p.name}</div>
                      <div className="text-xs font-semibold text-gray-500 truncate">{categoryNameById[p.categoryId] ?? "—"}</div>
                    </div>
                  ),
                  value: (p: any) => p.name,
                },
                { key: "stock", header: "Stock", sortable: true, value: (p: any) => p.stock ?? 0, render: (p: any) => <span className="font-black text-gray-900">{p.stock ?? 0}</span> },
                { key: "sales", header: "Sales", sortable: true, value: (p: any) => p.salesCount ?? 0, render: (p: any) => <span className="font-black text-gray-900">{p.salesCount ?? 0}</span> },
                {
                  key: "action",
                  header: "",
                  render: (p: any) => (
                    <Link href={`/merchant/products/${p.id}`} className="text-primary-700 hover:text-primary-800 font-black">
                      View
                    </Link>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>

        <Card className="col-span-12 lg:col-span-7">
          <CardHeader className="p-4 sm:p-6 border-b border-gray-100/60">
            <div className="text-lg font-black text-gray-900">Inventory overview</div>
            <div className="text-sm text-gray-500">{lowStock} low-stock items (≤ 10)</div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryByCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }} />
                  <Bar dataKey="value" fill="#0ea5e9" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-12 lg:col-span-5" id="messages">
          <CardHeader className="p-4 sm:p-6 border-b border-gray-100/60">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-lg font-black text-gray-900 truncate">Messages</div>
                <div className="text-sm text-gray-500">Recent conversations</div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-700">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-3 max-h-72 overflow-y-auto no-scrollbar">
              {[
                { from: "Al Jazeera Steel", at: "2h ago", subject: "RFQ follow-up: delivery terms", status: "PENDING" },
                { from: "Gulf Industrial", at: "1d ago", subject: "New order: confirmation needed", status: "APPROVED" },
                { from: "Eastern Supplies", at: "3d ago", subject: "Inquiry: bulk pricing", status: "PENDING" },
              ].map((m) => (
                <div key={`${m.from}-${m.at}`} className="rounded-2xl border border-gray-200/60 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-gray-900 truncate">{m.from}</div>
                      <div className="text-sm text-gray-600 mt-1 truncate">{m.subject}</div>
                      <div className="text-xs font-semibold text-gray-500 mt-2">{m.at}</div>
                    </div>
                    <StatusPill status={m.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  );
}
