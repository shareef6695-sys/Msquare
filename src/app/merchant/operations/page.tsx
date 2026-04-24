"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MerchantLayout } from "@/features/merchant/MerchantLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { loadSession } from "@/services/authStore";
import { getMerchantById } from "@/services/adminService";
import { loadOrders, markOrderShipped } from "@/services/orderStore";
import { listProducts, updateProduct } from "@/services/productService";
import { useExchangeRatesUsd } from "@/services/exchangeRateService";
import { SUPPORTED_CURRENCIES, convertCurrency, formatCurrency } from "@/utils/currencyConverter";
import { MOCK_CATEGORIES } from "@/data/mockCategories";
import { type CurrencyCode, type Order, type Product } from "@/types";
import { BarChart3, Boxes, Building2, Calculator, ClipboardList, FileDown, Receipt, Truck, Warehouse } from "lucide-react";

type OpsTab = "inventory" | "purchases" | "suppliers" | "finance" | "invoices" | "warehouse" | "reports";

const TABS: Array<{ key: OpsTab; label: string; icon: React.ReactNode }> = [
  { key: "inventory", label: "Inventory", icon: <Boxes className="w-4 h-4" /> },
  { key: "purchases", label: "Purchases", icon: <ClipboardList className="w-4 h-4" /> },
  { key: "suppliers", label: "Suppliers", icon: <Building2 className="w-4 h-4" /> },
  { key: "finance", label: "Finance", icon: <Calculator className="w-4 h-4" /> },
  { key: "invoices", label: "Invoices", icon: <Receipt className="w-4 h-4" /> },
  { key: "warehouse", label: "Warehouse", icon: <Warehouse className="w-4 h-4" /> },
  { key: "reports", label: "Reports", icon: <BarChart3 className="w-4 h-4" /> },
];

const isOpsTab = (v: string | null): v is OpsTab => {
  if (!v) return false;
  return (TABS as any).some((t: any) => t.key === v);
};

const defaultCurrency = (): CurrencyCode => {
  const raw = (process.env.NEXT_PUBLIC_DEFAULT_CURRENCY as CurrencyCode | undefined) ?? "SAR";
  return SUPPORTED_CURRENCIES.includes(raw) ? raw : "SAR";
};

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
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

type Supplier = {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  paymentTerms: string;
  suppliedProductIds: string[];
  createdAt: string;
};

type PurchaseOrder = {
  id: string;
  supplierId: string;
  status: "DRAFT" | "SENT" | "PARTIAL" | "RECEIVED" | "CANCELLED";
  items: Array<{ productId: string; qty: number; unitCost: number }>;
  createdAt: string;
  receivedAt?: string;
  purchaseInvoiceId?: string;
};

type InventoryLedgerEntry = {
  id: string;
  productId: string;
  type: "STOCK_IN" | "STOCK_OUT" | "ADJUST";
  qty: number;
  note?: string;
  warehouse?: string;
  at: string;
};

type WarehouseState = Record<string, { picking: "PENDING" | "PICKED"; packing: "PENDING" | "PACKED"; readyToShip: boolean }>;

const badgeClass = (status: string) => {
  const s = status.toUpperCase();
  if (["RECEIVED", "DELIVERED", "COMPLETED"].includes(s)) return "border-green-200/70 bg-green-50 text-green-800";
  if (["SENT", "SHIPPED"].includes(s)) return "border-blue-200/70 bg-blue-50 text-blue-800";
  if (["PARTIAL", "PROCESSING", "PAID", "UNDER_REVIEW"].includes(s)) return "border-amber-200/70 bg-amber-50 text-amber-800";
  if (["CANCELLED", "FAILED", "REJECTED"].includes(s)) return "border-red-200/70 bg-red-50 text-red-700";
  return "border-gray-200/70 bg-gray-50 text-gray-700";
};

export default function MerchantOperationsPage() {
  return (
    <Suspense
      fallback={
        <MerchantLayout>
          <div className="rounded-3xl border border-gray-200/60 bg-white p-10 text-sm font-semibold text-gray-600 shadow-sm shadow-gray-900/5">
            Loading Business Operations…
          </div>
        </MerchantLayout>
      }
    >
      <MerchantOperationsContent />
    </Suspense>
  );
}

function MerchantOperationsContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab: OpsTab = isOpsTab(sp.get("tab")) ? (sp.get("tab") as OpsTab) : "inventory";

  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string }>>([]);

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const { loading: ratesLoading, result: ratesResult } = useExchangeRatesUsd();
  const ratesUsd = ratesResult?.ratesUsd;
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>(defaultCurrency());

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [ledger, setLedger] = useState<InventoryLedgerEntry[]>([]);
  const [warehouseLocations, setWarehouseLocations] = useState<Record<string, string>>({});
  const [warehouseState, setWarehouseState] = useState<WarehouseState>({});

  const merchant = useMemo(() => (merchantId ? getMerchantById(merchantId) : null), [merchantId]);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      router.replace("/merchant-login");
      return;
    }
    if (session.user.role !== "MERCHANT") {
      router.replace("/customer/dashboard");
      return;
    }
    const id = session.user.merchantParentId ?? session.user.id;
    setMerchantId(id);
    setProducts(listProducts());
    setOrders(loadOrders());
  }, [router]);

  useEffect(() => {
    if (!merchantId || typeof window === "undefined") return;
    const key = `msquare.currency.merchant.${merchantId}.v1`;
    const raw = window.localStorage.getItem(key);
    if (raw && SUPPORTED_CURRENCIES.includes(raw as CurrencyCode)) setDisplayCurrency(raw as CurrencyCode);
    else setDisplayCurrency(((merchant?.sellingCurrency ?? defaultCurrency()) as CurrencyCode) ?? defaultCurrency());
  }, [merchant?.sellingCurrency, merchantId]);

  useEffect(() => {
    if (!merchantId || typeof window === "undefined") return;
    const base = `msquare.erp.${merchantId}.v1`;

    const seedSuppliers: Supplier[] = [
      {
        id: "s1",
        name: "Gulf Industrial Supply Co.",
        contactName: "Nasser Alqahtani",
        email: "supplier1@msquare.demo",
        phone: "+966 50 111 2233",
        paymentTerms: "Net 30",
        suppliedProductIds: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: "s2",
        name: "Emirates Fasteners Trading",
        contactName: "Sara Al Mansoori",
        email: "supplier2@msquare.demo",
        phone: "+971 50 222 3344",
        paymentTerms: "Net 15",
        suppliedProductIds: [],
        createdAt: new Date().toISOString(),
      },
    ];

    const seedPOs: PurchaseOrder[] = [
      {
        id: "po_1001",
        supplierId: "s1",
        status: "SENT",
        items: [],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      },
      {
        id: "po_1002",
        supplierId: "s2",
        status: "RECEIVED",
        items: [],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
        receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
        purchaseInvoiceId: "PINV-0002",
      },
    ];

    setSuppliers((s) => {
      const existing = safeJsonParse<Supplier[]>(window.localStorage.getItem(`${base}.suppliers`), []);
      if (existing.length > 0) return existing;
      window.localStorage.setItem(`${base}.suppliers`, JSON.stringify(seedSuppliers));
      return seedSuppliers;
    });

    setPurchaseOrders((p) => {
      const existing = safeJsonParse<PurchaseOrder[]>(window.localStorage.getItem(`${base}.purchases`), []);
      if (existing.length > 0) return existing;
      window.localStorage.setItem(`${base}.purchases`, JSON.stringify(seedPOs));
      return seedPOs;
    });

    setLedger(safeJsonParse<InventoryLedgerEntry[]>(window.localStorage.getItem(`${base}.inventoryLedger`), []));
    setWarehouseLocations(safeJsonParse<Record<string, string>>(window.localStorage.getItem(`${base}.warehouseLocations`), {}));
    setWarehouseState(safeJsonParse<WarehouseState>(window.localStorage.getItem(`${base}.warehouseState`), {}));
  }, [merchantId]);

  useEffect(() => {
    if (!merchantId || typeof window === "undefined") return;
    const base = `msquare.erp.${merchantId}.v1`;
    window.localStorage.setItem(`${base}.suppliers`, JSON.stringify(suppliers));
  }, [merchantId, suppliers]);

  useEffect(() => {
    if (!merchantId || typeof window === "undefined") return;
    const base = `msquare.erp.${merchantId}.v1`;
    window.localStorage.setItem(`${base}.purchases`, JSON.stringify(purchaseOrders));
  }, [merchantId, purchaseOrders]);

  useEffect(() => {
    if (!merchantId || typeof window === "undefined") return;
    const base = `msquare.erp.${merchantId}.v1`;
    window.localStorage.setItem(`${base}.inventoryLedger`, JSON.stringify(ledger));
  }, [merchantId, ledger]);

  useEffect(() => {
    if (!merchantId || typeof window === "undefined") return;
    const base = `msquare.erp.${merchantId}.v1`;
    window.localStorage.setItem(`${base}.warehouseLocations`, JSON.stringify(warehouseLocations));
  }, [merchantId, warehouseLocations]);

  useEffect(() => {
    if (!merchantId || typeof window === "undefined") return;
    const base = `msquare.erp.${merchantId}.v1`;
    window.localStorage.setItem(`${base}.warehouseState`, JSON.stringify(warehouseState));
  }, [merchantId, warehouseState]);

  const pushToast = (message: string) => {
    const id = `toast_${Math.random().toString(16).slice(2, 10)}`;
    setToasts((t) => [...t, { id, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };

  const myProducts = useMemo(() => {
    if (!merchantId) return [];
    return products.filter((p) => p.merchantId === merchantId);
  }, [merchantId, products]);

  const myOrders = useMemo(() => {
    if (!merchantId) return [];
    return orders.filter((o) => o.merchantId === merchantId).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [merchantId, orders]);

  const totals = useMemo(() => {
    const originalCurrency = (merchant?.sellingCurrency ?? defaultCurrency()) as CurrencyCode;
    const revenueOriginal = myOrders.reduce((sum, o) => sum + (o.originalAmount ?? o.totalAmount ?? 0), 0);
    const revenueConverted =
      ratesUsd && originalCurrency !== displayCurrency ? convertCurrency(revenueOriginal, originalCurrency, displayCurrency, ratesUsd).convertedAmount : null;
    const pendingPayments = myOrders.filter((o) => o.paymentStatus === "PENDING").length;
    const escrowHeld = myOrders.filter((o) => o.escrowStatus === "HELD").reduce((sum, o) => sum + (o.originalAmount ?? o.totalAmount ?? 0), 0);
    const lcCount = myOrders.filter((o) => o.paymentType === "lc" || o.paymentMethod === "LC").length;
    const vatRate = 0.15;
    const vat = revenueOriginal * vatRate;
    const vatConverted =
      ratesUsd && originalCurrency !== displayCurrency ? convertCurrency(vat, originalCurrency, displayCurrency, ratesUsd).convertedAmount : null;
    return { originalCurrency, revenueOriginal, revenueConverted, pendingPayments, escrowHeld, lcCount, vat, vatConverted };
  }, [displayCurrency, merchant?.sellingCurrency, myOrders, ratesUsd]);

  const goTab = (next: OpsTab) => {
    const params = new URLSearchParams(sp.toString());
    params.set("tab", next);
    router.replace(`/merchant/operations?${params.toString()}`);
  };

  const [inventoryForm, setInventoryForm] = useState<{ productId: string; type: InventoryLedgerEntry["type"]; qty: string; note: string; warehouse: string }>(
    {
      productId: "",
      type: "STOCK_IN",
      qty: "10",
      note: "",
      warehouse: "Main Warehouse",
    },
  );

  const applyStockChange = (input: { productId: string; type: InventoryLedgerEntry["type"]; qty: number; note?: string; warehouse?: string }) => {
    const p = products.find((x) => x.id === input.productId);
    if (!p) return;
    const current = p.stock ?? 0;
    const delta = input.type === "STOCK_IN" ? input.qty : input.type === "STOCK_OUT" ? -input.qty : input.qty - current;
    const nextStock = Math.max(0, current + delta);
    const updated = updateProduct(p.id, { stock: nextStock });
    if (!updated) return;
    setProducts(listProducts());
    setLedger((l) => [
      {
        id: `inv_${Math.random().toString(16).slice(2, 10)}`,
        productId: p.id,
        type: input.type,
        qty: input.qty,
        note: input.note?.trim() || undefined,
        warehouse: input.warehouse?.trim() || undefined,
        at: new Date().toISOString(),
      },
      ...l,
    ]);
    pushToast(`Inventory updated: ${p.name}`);
  };

  const [supplierForm, setSupplierForm] = useState<{ name: string; contactName: string; email: string; phone: string; paymentTerms: string }>({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    paymentTerms: "Net 30",
  });

  const addSupplier = () => {
    if (!supplierForm.name.trim()) return;
    const next: Supplier = {
      id: `s_${Math.random().toString(16).slice(2, 10)}`,
      name: supplierForm.name.trim(),
      contactName: supplierForm.contactName.trim() || "Contact",
      email: supplierForm.email.trim() || "supplier@msquare.demo",
      phone: supplierForm.phone.trim() || "+966 50 000 0000",
      paymentTerms: supplierForm.paymentTerms.trim() || "Net 30",
      suppliedProductIds: [],
      createdAt: new Date().toISOString(),
    };
    setSuppliers((s) => [next, ...s]);
    setSupplierForm({ name: "", contactName: "", email: "", phone: "", paymentTerms: "Net 30" });
    pushToast("Supplier added");
  };

  const [poForm, setPoForm] = useState<{ supplierId: string; productId: string; qty: string; unitCost: string }>({
    supplierId: "",
    productId: "",
    qty: "50",
    unitCost: "10",
  });

  const createPurchaseOrder = () => {
    if (!poForm.supplierId || !poForm.productId) return;
    const qty = Math.max(1, Number(poForm.qty) || 1);
    const unitCost = Math.max(0, Number(poForm.unitCost) || 0);
    const next: PurchaseOrder = {
      id: `po_${Math.random().toString(16).slice(2, 10)}`,
      supplierId: poForm.supplierId,
      status: "SENT",
      items: [{ productId: poForm.productId, qty, unitCost }],
      createdAt: new Date().toISOString(),
    };
    setPurchaseOrders((p) => [next, ...p]);
    pushToast("Purchase order created");
  };

  const receivePurchaseOrder = (poId: string) => {
    const po = purchaseOrders.find((p) => p.id === poId);
    if (!po || po.status === "RECEIVED" || po.status === "CANCELLED") return;
    for (const item of po.items) {
      const p = products.find((x) => x.id === item.productId);
      if (!p) continue;
      applyStockChange({ productId: p.id, type: "STOCK_IN", qty: item.qty, note: `Received via ${po.id}`, warehouse: "Main Warehouse" });
    }
    setPurchaseOrders((list) =>
      list.map((x) =>
        x.id === poId
          ? { ...x, status: "RECEIVED", receivedAt: new Date().toISOString(), purchaseInvoiceId: x.purchaseInvoiceId ?? `PINV-${poId}` }
          : x,
      ),
    );
    pushToast(`Received PO: ${poId}`);
  };

  const [warehouseFilter, setWarehouseFilter] = useState<"all" | "picking" | "packing" | "ready">("all");

  const setOrderWarehouseState = (orderId: string, patch: Partial<WarehouseState[string]>) => {
    setWarehouseState((s) => {
      const cur = s[orderId] ?? { picking: "PENDING", packing: "PENDING", readyToShip: false };
      return { ...s, [orderId]: { ...cur, ...patch } };
    });
  };

  const filteredWarehouseOrders = useMemo(() => {
    const withState = myOrders.map((o) => {
      const s = warehouseState[o.id] ?? { picking: "PENDING", packing: "PENDING", readyToShip: false };
      return { o, s };
    });
    if (warehouseFilter === "picking") return withState.filter((x) => x.s.picking === "PENDING");
    if (warehouseFilter === "packing") return withState.filter((x) => x.s.picking === "PICKED" && x.s.packing === "PENDING");
    if (warehouseFilter === "ready") return withState.filter((x) => x.s.readyToShip);
    return withState;
  }, [myOrders, warehouseFilter, warehouseState]);

  const categoryById = useMemo(() => new Map(MOCK_CATEGORIES.map((c) => [c.id, c.name])), []);

  return (
    <MerchantLayout>
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Business Operations</h1>
          <p className="text-gray-500">Lightweight ERP for inventory, purchases, suppliers, finance, invoices, and warehouse.</p>
          <div className="text-[11px] text-gray-500 mt-2">
            {ratesLoading ? (
              <span>Loading exchange rate…</span>
            ) : ratesResult ? (
              <span>
                Financial metrics use your dashboard currency • Last updated: {new Date(ratesResult.updatedAt).toLocaleString()}
                {ratesResult.usedFallback ? " • Using last available exchange rate" : ""}
                {ratesResult.stale ? " • Rate may be outdated" : ""}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link href="/merchant/dashboard">
            <Button variant="outline">Back to dashboard</Button>
          </Link>
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
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          {
            label: "Sales revenue",
            value: formatCurrency(totals.revenueOriginal, totals.originalCurrency),
            extra: totals.revenueConverted !== null ? `≈ ${formatCurrency(totals.revenueConverted, displayCurrency)}` : null,
          },
          { label: "Pending payments", value: String(totals.pendingPayments), extra: null },
          { label: "Escrow held", value: formatCurrency(totals.escrowHeld, totals.originalCurrency), extra: null },
          { label: "LC transactions", value: String(totals.lcCount), extra: null },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">{s.label}</div>
              <div className="text-2xl font-black text-gray-900 mt-2">{s.value}</div>
              {s.extra ? <div className="text-[11px] font-semibold text-gray-500 mt-2">{s.extra}</div> : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.key ? "border-primary-200/70 bg-primary-50 text-primary-800" : "border-gray-200/60 bg-white text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => goTab(t.key)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "inventory" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <div className="p-6 border-b border-gray-100/60">
              <div className="text-lg font-black text-gray-900">Stock levels</div>
              <div className="text-sm text-gray-500 mt-1">Connected to your product catalog (mock).</div>
            </div>
            <CardContent className="p-6">
              {myProducts.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
                  <div className="text-lg font-black text-gray-900">No products</div>
                  <div className="text-sm text-gray-500 mt-2">Add products to manage inventory.</div>
                  <div className="mt-6">
                    <Link href="/merchant/products/new">
                      <Button>Add product</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-[880px] w-full text-sm">
                    <thead>
                      <tr className="text-xs font-bold uppercase tracking-widest text-gray-400">
                        <th className="text-left py-2 pr-4">Product</th>
                        <th className="text-left py-2 pr-4">Category</th>
                        <th className="text-left py-2 pr-4">Stock</th>
                        <th className="text-left py-2 pr-4">Low stock</th>
                        <th className="text-left py-2 pr-4">Warehouse location</th>
                        <th className="text-right py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/60">
                      {myProducts.map((p) => {
                        const low = (p.stock ?? 0) <= 20;
                        return (
                          <tr key={p.id} className="align-top">
                            <td className="py-3 pr-4">
                              <div className="font-black text-gray-900">{p.name}</div>
                              <div className="text-xs text-gray-500 mt-1">{p.id}</div>
                            </td>
                            <td className="py-3 pr-4 text-gray-700">{categoryById.get(p.categoryId) ?? p.categoryId}</td>
                            <td className="py-3 pr-4">
                              <div className="font-black text-gray-900">{p.stock ?? 0}</div>
                            </td>
                            <td className="py-3 pr-4">
                              {low ? (
                                <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-xs font-black text-amber-900">
                                  Low
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full border border-gray-200/70 bg-gray-50 px-3 py-1 text-xs font-black text-gray-700">
                                  OK
                                </span>
                              )}
                            </td>
                            <td className="py-3 pr-4">
                              <input
                                value={warehouseLocations[p.id] ?? "Main Warehouse • A-01"}
                                onChange={(e) => setWarehouseLocations((m) => ({ ...m, [p.id]: e.target.value }))}
                                className="w-full rounded-xl border border-gray-200/60 bg-white px-3 py-2 text-xs font-semibold text-gray-800"
                              />
                            </td>
                            <td className="py-3 text-right">
                              <Link href={`/merchant/products/${p.id}`}>
                                <Button size="sm" variant="outline">
                                  View
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <div className="p-6 border-b border-gray-100/60">
                <div className="text-lg font-black text-gray-900">Stock in / out</div>
                <div className="text-sm text-gray-500 mt-1">Create inventory movements and adjustments.</div>
              </div>
              <CardContent className="p-6 space-y-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Product</div>
                  <select
                    value={inventoryForm.productId}
                    onChange={(e) => setInventoryForm((s) => ({ ...s, productId: e.target.value }))}
                    className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
                  >
                    <option value="">Select product…</option>
                    {myProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Type</div>
                    <select
                      value={inventoryForm.type}
                      onChange={(e) => setInventoryForm((s) => ({ ...s, type: e.target.value as any }))}
                      className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
                    >
                      <option value="STOCK_IN">Stock in</option>
                      <option value="STOCK_OUT">Stock out</option>
                      <option value="ADJUST">Adjust to qty</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                      {inventoryForm.type === "ADJUST" ? "New qty" : "Qty"}
                    </div>
                    <input
                      value={inventoryForm.qty}
                      onChange={(e) => setInventoryForm((s) => ({ ...s, qty: e.target.value }))}
                      inputMode="numeric"
                      className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Warehouse</div>
                  <input
                    value={inventoryForm.warehouse}
                    onChange={(e) => setInventoryForm((s) => ({ ...s, warehouse: e.target.value }))}
                    className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
                  />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Note</div>
                  <input
                    value={inventoryForm.note}
                    onChange={(e) => setInventoryForm((s) => ({ ...s, note: e.target.value }))}
                    className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
                    placeholder="e.g., cycle count adjustment"
                  />
                </div>
                <Button
                  disabled={!inventoryForm.productId || !Number.isFinite(Number(inventoryForm.qty)) || Number(inventoryForm.qty) < 0}
                  onClick={() => {
                    const qty = Math.max(0, Number(inventoryForm.qty) || 0);
                    applyStockChange({
                      productId: inventoryForm.productId,
                      type: inventoryForm.type,
                      qty,
                      note: inventoryForm.note,
                      warehouse: inventoryForm.warehouse,
                    });
                  }}
                  className="w-full"
                >
                  Apply
                </Button>
              </CardContent>
            </Card>

            <Card>
              <div className="p-6 border-b border-gray-100/60">
                <div className="text-lg font-black text-gray-900">Recent inventory activity</div>
              </div>
              <CardContent className="p-6 space-y-3">
                {ledger.length === 0 ? (
                  <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-600">No movements yet.</div>
                ) : (
                  ledger.slice(0, 8).map((e) => {
                    const p = products.find((x) => x.id === e.productId);
                    return (
                      <div key={e.id} className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-black text-gray-900 truncate">{p?.name ?? e.productId}</div>
                            <div className="text-xs text-gray-500 mt-1">{new Date(e.at).toLocaleString()}</div>
                          </div>
                          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${badgeClass(e.type)}`}>{e.type}</span>
                        </div>
                        <div className="mt-2 text-sm font-semibold text-gray-800">
                          Qty: <span className="font-black">{e.qty}</span> • {e.warehouse ?? "Warehouse"}
                        </div>
                        {e.note ? <div className="mt-1 text-xs text-gray-500">{e.note}</div> : null}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === "suppliers" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <div className="p-6 border-b border-gray-100/60">
              <div className="text-lg font-black text-gray-900">Suppliers</div>
              <div className="text-sm text-gray-500 mt-1">Manage vendors and payment terms (mock).</div>
            </div>
            <CardContent className="p-6">
              {suppliers.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
                  <div className="text-lg font-black text-gray-900">No suppliers</div>
                  <div className="text-sm text-gray-500 mt-2">Create a supplier to start purchase orders.</div>
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-[860px] w-full text-sm">
                    <thead>
                      <tr className="text-xs font-bold uppercase tracking-widest text-gray-400">
                        <th className="text-left py-2 pr-4">Supplier</th>
                        <th className="text-left py-2 pr-4">Contact</th>
                        <th className="text-left py-2 pr-4">Payment terms</th>
                        <th className="text-left py-2 pr-4">Supplied products</th>
                        <th className="text-right py-2">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/60">
                      {suppliers.map((s) => (
                        <tr key={s.id}>
                          <td className="py-3 pr-4">
                            <div className="font-black text-gray-900">{s.name}</div>
                            <div className="text-xs text-gray-500 mt-1">{s.id}</div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="text-sm font-semibold text-gray-800">{s.contactName}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {s.email} • {s.phone}
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="inline-flex items-center rounded-full border border-gray-200/70 bg-gray-50 px-3 py-1 text-xs font-black text-gray-700">
                              {s.paymentTerms}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-gray-700">{s.suppliedProductIds.length}</td>
                          <td className="py-3 text-right text-xs text-gray-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <div className="p-6 border-b border-gray-100/60">
              <div className="text-lg font-black text-gray-900">Add supplier</div>
              <div className="text-sm text-gray-500 mt-1">Quick vendor entry (mock).</div>
            </div>
            <CardContent className="p-6 space-y-3">
              <input
                value={supplierForm.name}
                onChange={(e) => setSupplierForm((s) => ({ ...s, name: e.target.value }))}
                className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
                placeholder="Supplier name"
              />
              <input
                value={supplierForm.contactName}
                onChange={(e) => setSupplierForm((s) => ({ ...s, contactName: e.target.value }))}
                className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
                placeholder="Contact person"
              />
              <input
                value={supplierForm.email}
                onChange={(e) => setSupplierForm((s) => ({ ...s, email: e.target.value }))}
                className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
                placeholder="Email"
              />
              <input
                value={supplierForm.phone}
                onChange={(e) => setSupplierForm((s) => ({ ...s, phone: e.target.value }))}
                className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
                placeholder="Phone"
              />
              <select
                value={supplierForm.paymentTerms}
                onChange={(e) => setSupplierForm((s) => ({ ...s, paymentTerms: e.target.value }))}
                className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
              >
                {["Prepaid", "Net 7", "Net 15", "Net 30", "Net 45"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <Button disabled={!supplierForm.name.trim()} onClick={addSupplier} className="w-full">
                Add supplier
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "purchases" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <div className="p-6 border-b border-gray-100/60">
              <div className="text-lg font-black text-gray-900">Purchase orders</div>
              <div className="text-sm text-gray-500 mt-1">Track supplier orders and received goods.</div>
            </div>
            <CardContent className="p-6 space-y-3">
              {purchaseOrders.length === 0 ? (
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-600">No purchase orders.</div>
              ) : (
                purchaseOrders.slice(0, 12).map((po) => {
                  const supplier = suppliers.find((s) => s.id === po.supplierId);
                  const total = po.items.reduce((sum, it) => sum + it.qty * it.unitCost, 0);
                  return (
                    <div key={po.id} className="rounded-3xl border border-gray-200/60 bg-white p-5">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="text-sm font-black text-gray-900">{po.id}</div>
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${badgeClass(po.status)}`}>{po.status}</span>
                            {po.purchaseInvoiceId ? (
                              <span className="inline-flex items-center rounded-full border border-gray-200/70 bg-gray-50 px-3 py-1 text-xs font-black text-gray-700">
                                Invoice {po.purchaseInvoiceId}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            Supplier <span className="font-semibold text-gray-700">{supplier?.name ?? po.supplierId}</span> • Created{" "}
                            {new Date(po.createdAt).toLocaleDateString()}
                            {po.receivedAt ? ` • Received ${new Date(po.receivedAt).toLocaleDateString()}` : ""}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Estimated total</div>
                          <div className="text-sm font-black text-gray-900">{formatCurrency(total, totals.originalCurrency)}</div>
                          <div className="mt-2">
                            <Button
                              size="sm"
                              disabled={po.status === "RECEIVED" || po.status === "CANCELLED" || po.items.length === 0}
                              onClick={() => receivePurchaseOrder(po.id)}
                            >
                              Mark received
                            </Button>
                          </div>
                        </div>
                      </div>
                      {po.items.length > 0 ? (
                        <div className="mt-4 overflow-auto">
                          <table className="min-w-[720px] w-full text-sm">
                            <thead>
                              <tr className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                <th className="text-left py-2 pr-4">Item</th>
                                <th className="text-left py-2 pr-4">Qty</th>
                                <th className="text-left py-2 pr-4">Unit cost</th>
                                <th className="text-right py-2">Line</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100/60">
                              {po.items.map((it, idx) => {
                                const p = products.find((x) => x.id === it.productId);
                                return (
                                  <tr key={`${po.id}_${idx}`}>
                                    <td className="py-2 pr-4">
                                      <div className="font-semibold text-gray-900">{p?.name ?? it.productId}</div>
                                    </td>
                                    <td className="py-2 pr-4 text-gray-700">{it.qty}</td>
                                    <td className="py-2 pr-4 text-gray-700">{formatCurrency(it.unitCost, totals.originalCurrency)}</td>
                                    <td className="py-2 text-right font-black text-gray-900">{formatCurrency(it.qty * it.unitCost, totals.originalCurrency)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                          This PO is a seeded mock record. Create a new PO to include items.
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <div className="p-6 border-b border-gray-100/60">
              <div className="text-lg font-black text-gray-900">Create purchase order</div>
              <div className="text-sm text-gray-500 mt-1">Lightweight PO builder.</div>
            </div>
            <CardContent className="p-6 space-y-3">
              <select
                value={poForm.supplierId}
                onChange={(e) => setPoForm((s) => ({ ...s, supplierId: e.target.value }))}
                className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
              >
                <option value="">Supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                value={poForm.productId}
                onChange={(e) => setPoForm((s) => ({ ...s, productId: e.target.value }))}
                className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
              >
                <option value="">Product…</option>
                {myProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={poForm.qty}
                  onChange={(e) => setPoForm((s) => ({ ...s, qty: e.target.value }))}
                  inputMode="numeric"
                  className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
                  placeholder="Qty"
                />
                <input
                  value={poForm.unitCost}
                  onChange={(e) => setPoForm((s) => ({ ...s, unitCost: e.target.value }))}
                  inputMode="decimal"
                  className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
                  placeholder="Unit cost"
                />
              </div>
              <Button disabled={!poForm.supplierId || !poForm.productId} onClick={createPurchaseOrder} className="w-full">
                Create PO
              </Button>
              <div className="text-[11px] text-gray-500">
                Receiving goods will automatically increase product stock (mock) via inventory movements.
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "finance" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <div className="p-6 border-b border-gray-100/60">
              <div className="text-lg font-black text-gray-900">Finance overview</div>
              <div className="text-sm text-gray-500 mt-1">Connected to orders, escrow and LC status (mock).</div>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Sales revenue</div>
                  <div className="mt-2 text-xl font-black text-gray-900">{formatCurrency(totals.revenueOriginal, totals.originalCurrency)}</div>
                  {totals.revenueConverted !== null ? (
                    <div className="text-[11px] font-semibold text-gray-500 mt-2">≈ {formatCurrency(totals.revenueConverted, displayCurrency)}</div>
                  ) : null}
                </div>
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400">VAT summary</div>
                  <div className="mt-2 text-xl font-black text-gray-900">{formatCurrency(totals.vat, totals.originalCurrency)}</div>
                  {totals.vatConverted !== null ? (
                    <div className="text-[11px] font-semibold text-gray-500 mt-2">≈ {formatCurrency(totals.vatConverted, displayCurrency)}</div>
                  ) : (
                    <div className="text-[11px] font-semibold text-gray-500 mt-2">Assumed VAT rate: 15%</div>
                  )}
                </div>
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Pending payments</div>
                  <div className="mt-2 text-xl font-black text-gray-900">{totals.pendingPayments}</div>
                </div>
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Escrow balance (held)</div>
                  <div className="mt-2 text-xl font-black text-gray-900">{formatCurrency(totals.escrowHeld, totals.originalCurrency)}</div>
                </div>
              </div>

              <div className="mt-8 overflow-auto">
                <div className="text-sm font-black text-gray-900 mb-3">Recent financial activity</div>
                <table className="min-w-[920px] w-full text-sm">
                  <thead>
                    <tr className="text-xs font-bold uppercase tracking-widest text-gray-400">
                      <th className="text-left py-2 pr-4">Order</th>
                      <th className="text-left py-2 pr-4">Payment</th>
                      <th className="text-left py-2 pr-4">Escrow</th>
                      <th className="text-left py-2 pr-4">LC</th>
                      <th className="text-right py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/60">
                    {myOrders.slice(0, 10).map((o) => {
                      const originalAmount = o.originalAmount ?? o.totalAmount ?? 0;
                      const originalCurrency = (o.originalCurrency ?? totals.originalCurrency) as CurrencyCode;
                      const converted =
                        ratesUsd && originalCurrency !== displayCurrency ? convertCurrency(originalAmount, originalCurrency, displayCurrency, ratesUsd).convertedAmount : null;
                      return (
                        <tr key={o.id}>
                          <td className="py-3 pr-4">
                            <div className="font-black text-gray-900">{o.id}</div>
                            <div className="text-xs text-gray-500 mt-1">{new Date(o.createdAt).toLocaleDateString()}</div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${badgeClass(o.paymentStatus)}`}>
                              {o.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-gray-700">{o.escrowStatus ?? "-"}</td>
                          <td className="py-3 pr-4 text-gray-700">{o.lcStatus ?? "-"}</td>
                          <td className="py-3 text-right">
                            <div className="font-black text-gray-900">{formatCurrency(originalAmount, originalCurrency)}</div>
                            {converted !== null ? <div className="text-[11px] font-semibold text-gray-500 mt-1">≈ {formatCurrency(converted, displayCurrency)}</div> : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <div className="p-6 border-b border-gray-100/60">
                <div className="text-lg font-black text-gray-900">Quick actions</div>
              </div>
              <CardContent className="p-6 space-y-3">
                <Link href="/merchant/payments">
                  <Button variant="outline" className="w-full">
                    Open payments
                  </Button>
                </Link>
                <Link href="/merchant/orders">
                  <Button variant="outline" className="w-full">
                    Open orders
                  </Button>
                </Link>
                <Link href="/merchant/trade-finance">
                  <Button variant="outline" className="w-full">
                    Trade finance
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <div className="p-6 border-b border-gray-100/60">
                <div className="text-lg font-black text-gray-900">Payout status</div>
                <div className="text-sm text-gray-500 mt-1">Mock operational view.</div>
              </div>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                  <span className="text-sm font-semibold text-gray-700">Merchant</span>
                  <span className="text-sm font-black text-gray-900">{merchant?.businessName ?? "Merchant"}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                  <span className="text-sm font-semibold text-gray-700">Selling currency</span>
                  <span className="text-sm font-black text-gray-900">{(merchant?.sellingCurrency ?? defaultCurrency()) as CurrencyCode}</span>
                </div>
                <div className="text-[11px] text-gray-500">Settlement logic is unchanged; this module is reporting-only.</div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === "invoices" && (
        <Card>
          <div className="p-6 border-b border-gray-100/60 flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-black text-gray-900">Invoices</div>
              <div className="text-sm text-gray-500 mt-1">Commercial invoices, proformas, and LC-related docs (mock).</div>
            </div>
            <Link href="/merchant/orders">
              <Button variant="outline">Open orders</Button>
            </Link>
          </div>
          <CardContent className="p-6 space-y-3">
            {myOrders.length === 0 ? (
              <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-600">No orders yet.</div>
            ) : (
              myOrders.slice(0, 10).map((o) => {
                const isLc = o.paymentType === "lc" || o.paymentMethod === "LC";
                const commercial = o.invoices?.orderInvoiceHtml ?? "";
                const proforma = o.invoices?.proformaInvoiceHtml ?? "";
                return (
                  <div key={o.id} className="rounded-3xl border border-gray-200/60 bg-white p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-black text-gray-900">{o.id}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Type <span className="font-semibold text-gray-700">{isLc ? "LC / Proforma" : "Commercial"}</span> • Generated{" "}
                          {o.invoices?.generatedAt ? new Date(o.invoices.generatedAt).toLocaleString() : "—"}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!commercial}
                          onClick={() => openPrintableDocument({ html: commercial, title: `Commercial Invoice - ${o.id}` })}
                        >
                          <FileDown className="w-4 h-4 mr-2" />
                          Print invoice
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!commercial}
                          onClick={() => downloadHtmlDocument({ html: commercial, filename: `MSquare-Commercial-Invoice-${o.id}.html` })}
                        >
                          Download invoice
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!proforma}
                          onClick={() => openPrintableDocument({ html: proforma, title: `Proforma Invoice - ${o.id}` })}
                        >
                          <FileDown className="w-4 h-4 mr-2" />
                          Print proforma
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!proforma}
                          onClick={() => downloadHtmlDocument({ html: proforma, filename: `MSquare-Proforma-Invoice-${o.id}.html` })}
                        >
                          Download proforma
                        </Button>
                      </div>
                    </div>
                    {!commercial && !proforma ? (
                      <div className="mt-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                        No invoice HTML is attached to this order yet in the mock store.
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {tab === "warehouse" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <div className="p-6 border-b border-gray-100/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="text-lg font-black text-gray-900">Warehouse</div>
                <div className="text-sm text-gray-500 mt-1">Picking, packing, and ready-to-ship workflow (mock).</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all" as const, label: "All" },
                  { key: "picking" as const, label: "Picking" },
                  { key: "packing" as const, label: "Packing" },
                  { key: "ready" as const, label: "Ready" },
                ].map((f) => (
                  <button
                    key={f.key}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      warehouseFilter === f.key ? "border-primary-200/70 bg-primary-50 text-primary-800" : "border-gray-200/60 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => setWarehouseFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <CardContent className="p-6 space-y-4">
              {filteredWarehouseOrders.length === 0 ? (
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-600">No orders match this filter.</div>
              ) : (
                filteredWarehouseOrders.slice(0, 10).map(({ o, s }) => (
                  <div key={o.id} className="rounded-3xl border border-gray-200/60 bg-white p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-black text-gray-900">{o.id}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Picking <span className="font-semibold text-gray-700">{s.picking}</span> • Packing{" "}
                          <span className="font-semibold text-gray-700">{s.packing}</span> • Ready{" "}
                          <span className="font-semibold text-gray-700">{s.readyToShip ? "YES" : "NO"}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" disabled={s.picking === "PICKED"} onClick={() => setOrderWarehouseState(o.id, { picking: "PICKED" })}>
                          Pick
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={s.picking !== "PICKED" || s.packing === "PACKED"}
                          onClick={() => setOrderWarehouseState(o.id, { packing: "PACKED" })}
                        >
                          Pack
                        </Button>
                        <Button
                          size="sm"
                          disabled={s.picking !== "PICKED" || s.packing !== "PACKED" || s.readyToShip}
                          onClick={() => setOrderWarehouseState(o.id, { readyToShip: true })}
                        >
                          Ready to ship
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!s.readyToShip || o.status === "SHIPPED" || o.status === "DELIVERED"}
                          onClick={() => {
                            const next = markOrderShipped(o.id);
                            setOrders(next);
                            setOrderWarehouseState(o.id, { readyToShip: false });
                            pushToast(`Order shipped: ${o.id}`);
                          }}
                        >
                          <Truck className="w-4 h-4 mr-2" />
                          Mark shipped
                        </Button>
                        <Link href={`/merchant/orders/${o.id}`}>
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <div className="p-6 border-b border-gray-100/60">
                <div className="text-lg font-black text-gray-900">Ready to ship</div>
              </div>
              <CardContent className="p-6 space-y-3">
                {myOrders
                  .filter((o) => (warehouseState[o.id]?.readyToShip ?? false) === true)
                  .slice(0, 8)
                  .map((o) => (
                    <div key={o.id} className="flex items-center justify-between rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                      <div className="text-sm font-black text-gray-900">{o.id}</div>
                      <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">
                        Ready
                      </span>
                    </div>
                  ))}
                {myOrders.filter((o) => (warehouseState[o.id]?.readyToShip ?? false) === true).length === 0 ? (
                  <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-600">No orders ready.</div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <div className="p-6 border-b border-gray-100/60">
                <div className="text-lg font-black text-gray-900">Stock by warehouse</div>
              </div>
              <CardContent className="p-6 space-y-2">
                {myProducts.slice(0, 8).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-gray-900 truncate">{p.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{warehouseLocations[p.id] ?? "Main Warehouse • A-01"}</div>
                    </div>
                    <div className="text-sm font-black text-gray-900">{p.stock ?? 0}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === "reports" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <div className="p-6 border-b border-gray-100/60">
              <div className="text-lg font-black text-gray-900">Reports</div>
              <div className="text-sm text-gray-500 mt-1">Lightweight operational reports from mock data.</div>
            </div>
            <CardContent className="p-6 space-y-8">
              <div>
                <div className="text-sm font-black text-gray-900 mb-3">Sales report</div>
                <div className="overflow-auto">
                  <table className="min-w-[860px] w-full text-sm">
                    <thead>
                      <tr className="text-xs font-bold uppercase tracking-widest text-gray-400">
                        <th className="text-left py-2 pr-4">Order</th>
                        <th className="text-left py-2 pr-4">Method</th>
                        <th className="text-left py-2 pr-4">Status</th>
                        <th className="text-right py-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/60">
                      {myOrders.slice(0, 10).map((o) => {
                        const originalAmount = o.originalAmount ?? o.totalAmount ?? 0;
                        const originalCurrency = (o.originalCurrency ?? totals.originalCurrency) as CurrencyCode;
                        const converted =
                          ratesUsd && originalCurrency !== displayCurrency ? convertCurrency(originalAmount, originalCurrency, displayCurrency, ratesUsd).convertedAmount : null;
                        return (
                          <tr key={o.id}>
                            <td className="py-3 pr-4 font-black text-gray-900">{o.id}</td>
                            <td className="py-3 pr-4 text-gray-700">{o.paymentMethod}</td>
                            <td className="py-3 pr-4">
                              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${badgeClass(o.status)}`}>{o.status}</span>
                            </td>
                            <td className="py-3 text-right">
                              <div className="font-black text-gray-900">{formatCurrency(originalAmount, originalCurrency)}</div>
                              {converted !== null ? <div className="text-[11px] font-semibold text-gray-500 mt-1">≈ {formatCurrency(converted, displayCurrency)}</div> : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="text-sm font-black text-gray-900 mb-3">Inventory report (low stock)</div>
                <div className="space-y-2">
                  {myProducts.filter((p) => (p.stock ?? 0) <= 20).length === 0 ? (
                    <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-600">No low stock alerts.</div>
                  ) : (
                    myProducts
                      .filter((p) => (p.stock ?? 0) <= 20)
                      .slice(0, 8)
                      .map((p) => (
                        <div key={p.id} className="flex items-center justify-between rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3">
                          <div className="min-w-0">
                            <div className="text-sm font-black text-amber-900 truncate">{p.name}</div>
                            <div className="text-xs text-amber-900/80 mt-1">{warehouseLocations[p.id] ?? "Main Warehouse • A-01"}</div>
                          </div>
                          <div className="text-sm font-black text-amber-900">{p.stock ?? 0}</div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm font-black text-gray-900 mb-3">Purchase report</div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {(["DRAFT", "SENT", "PARTIAL", "RECEIVED"] as const).map((s) => (
                    <div key={s} className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                      <div className="text-xs font-bold uppercase tracking-widest text-gray-400">{s}</div>
                      <div className="mt-1 text-2xl font-black text-gray-900">{purchaseOrders.filter((p) => p.status === s).length}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-black text-gray-900 mb-3">Payment report</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Escrow held</div>
                    <div className="mt-1 text-xl font-black text-gray-900">{formatCurrency(totals.escrowHeld, totals.originalCurrency)}</div>
                  </div>
                  <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-400">LC orders</div>
                    <div className="mt-1 text-xl font-black text-gray-900">{totals.lcCount}</div>
                  </div>
                  <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Pending payments</div>
                    <div className="mt-1 text-xl font-black text-gray-900">{totals.pendingPayments}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <div className="p-6 border-b border-gray-100/60">
                <div className="text-lg font-black text-gray-900">Connected modules</div>
              </div>
              <CardContent className="p-6 space-y-2">
                {[
                  { label: "Products", href: "/merchant/products", icon: <Boxes className="w-4 h-4" /> },
                  { label: "Orders", href: "/merchant/orders", icon: <Truck className="w-4 h-4" /> },
                  { label: "Payments", href: "/merchant/payments", icon: <Calculator className="w-4 h-4" /> },
                ].map((x) => (
                  <Link key={x.href} href={x.href} className="block rounded-2xl border border-gray-200/60 bg-white px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        {x.icon}
                        {x.label}
                      </div>
                      <span className="text-xs font-black text-primary-700">Open</span>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card>
              <div className="p-6 border-b border-gray-100/60">
                <div className="text-lg font-black text-gray-900">Notes</div>
              </div>
              <CardContent className="p-6 text-sm text-gray-700 space-y-2">
                <div>ERP is lightweight and uses mock data + local storage.</div>
                <div>Inventory movements update product stock in the mock product store.</div>
                <div>Purchases receiving automatically increases stock.</div>
                <div>Warehouse status is operational only and does not alter financial settlement.</div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {toasts.length > 0 && (
        <div className="fixed right-4 top-24 z-[60] space-y-2">
          {toasts.slice(-4).map((t) => (
            <div
              key={t.id}
              className="max-w-sm rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-lg shadow-gray-900/15"
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </MerchantLayout>
  );
}

