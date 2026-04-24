"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MerchantLayout } from "@/features/merchant/MerchantLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { requireRole } from "@/services/authStore";
import { getComplianceConfig, getMerchantById } from "@/services/adminService";
import { addProduct, listProducts } from "@/services/productService";
import { MOCK_CATEGORIES } from "@/data/mockCategories";

const startOfDayUtc = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

const daysUntil = (expiryDate: string, now = new Date()) => {
  const expiry = new Date(`${expiryDate}T00:00:00.000Z`);
  const diffMs = startOfDayUtc(expiry) - startOfDayUtc(now);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

const isExpiredInGrace = (
  doc: { expiryDate: string; overrideExpiry?: string; status?: string },
  graceDays: number,
  now = new Date(),
) => {
  if (doc.status === "rejected" || doc.status === "under_review") return false;
  const effective = doc.overrideExpiry ?? doc.expiryDate;
  const dte = daysUntil(effective, now);
  return dte < 0 && Math.abs(dte) <= graceDays;
};

export default function MerchantProductsPage() {
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [teamRole, setTeamRole] = useState<"admin" | "manager" | "viewer">("admin");
  const [refreshKey, setRefreshKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string }>>([]);

  const [draft, setDraft] = useState({
    name: "",
    description: "",
    price: "100",
    minOrderQuantity: "10",
    stock: "100",
    categoryId: MOCK_CATEGORIES[0]?.id ?? "c1",
    imageUrl: "https://via.placeholder.com/600x450.png?text=MSquare+Product",
  });

  useEffect(() => {
    const gate = requireRole("MERCHANT");
    if (!gate.ok) return;
    setMerchantId(gate.session.user.merchantParentId ?? gate.session.user.id);
    setTeamRole((gate.session.user.merchantTeamRole ?? "admin") as any);
  }, []);

  const pushToast = (message: string) => {
    const id = `toast_${Math.random().toString(16).slice(2, 10)}`;
    setToasts((t) => [...t, { id, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };

  const merchant = useMemo(() => (merchantId ? getMerchantById(merchantId) : null), [merchantId]);

  const createGate = useMemo(() => {
    if (!merchant) return { ok: false, reason: "Merchant account not found." };
    if (teamRole === "viewer") return { ok: false, reason: "Viewer role cannot add products." };
    if (merchant.restrictionLevel === "full_hold") return { ok: false, reason: "Account is on compliance hold. New products are blocked." };
    const config = getComplianceConfig();
    const graceActive = Boolean(merchant.complianceDocuments?.some((d) => isExpiredInGrace(d, config.gracePeriodDays)));
    if (graceActive && !config.limitedOperations.merchant.allowNewProducts) {
      return { ok: false, reason: "New products are restricted during the compliance grace period." };
    }
    return { ok: true, reason: null as string | null };
  }, [merchant, teamRole]);

  const products = merchantId ? listProducts().filter((p) => p.merchantId === merchantId) : [];

  const Modal = ({ open, title, children }: { open: boolean; title: string; children: React.ReactNode }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <button className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => (busy ? null : setCreateOpen(false))} />
        <div className="relative w-full max-w-2xl rounded-3xl border border-gray-200/60 bg-white shadow-xl shadow-gray-900/20">
          <div className="p-6 border-b border-gray-100/60">
            <div className="text-lg font-black text-gray-900">{title}</div>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    );
  };

  return (
    <MerchantLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Products</h1>
          <p className="text-gray-500">Add and manage your catalog using mock data only.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={!createGate.ok} title={createGate.reason ?? undefined}>
          Add product
        </Button>
      </div>

      <Card>
        <div className="p-6 border-b border-gray-100/60 flex items-center justify-between">
          <div className="text-lg font-black text-gray-900">My catalog</div>
          <div className="text-sm font-semibold text-gray-500">{products.length} items</div>
        </div>
        <CardContent className="p-6">
          {products.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
              <div className="text-lg font-black text-gray-900">No products yet</div>
              <div className="text-sm text-gray-500 mt-2">Add your first product to appear in the marketplace.</div>
              <Button className="mt-6" onClick={() => setCreateOpen(true)} disabled={!createGate.ok} title={createGate.reason ?? undefined}>
                Add product
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {products.map((p) => (
                <div key={p.id} className="rounded-2xl border border-gray-200/60 bg-white px-5 py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-gray-900 truncate">{p.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {MOCK_CATEGORIES.find((c) => c.id === p.categoryId)?.name ?? "Category"} • MOQ {p.minOrderQuantity} • Stock {p.stock}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{p.location}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-gray-900">${p.price.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 mt-1">{p.createdAt ?? ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={createOpen} title="Add product">
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-black text-gray-900 mb-2">Product name</div>
              <input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="e.g., Industrial Steel Pipes"
                disabled={busy}
              />
            </div>
            <div>
              <div className="text-sm font-black text-gray-900 mb-2">Category</div>
              <select
                value={draft.categoryId}
                onChange={(e) => setDraft((d) => ({ ...d, categoryId: e.target.value }))}
                className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
                disabled={busy}
              >
                {MOCK_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="text-sm font-black text-gray-900 mb-2">Description</div>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              rows={4}
              className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="Short product description for buyers…"
              disabled={busy}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-black text-gray-900 mb-2">Price (USD)</div>
              <input
                value={draft.price}
                onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                inputMode="decimal"
                className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
                disabled={busy}
              />
            </div>
            <div>
              <div className="text-sm font-black text-gray-900 mb-2">MOQ</div>
              <input
                value={draft.minOrderQuantity}
                onChange={(e) => setDraft((d) => ({ ...d, minOrderQuantity: e.target.value }))}
                inputMode="numeric"
                className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
                disabled={busy}
              />
            </div>
            <div>
              <div className="text-sm font-black text-gray-900 mb-2">Stock</div>
              <input
                value={draft.stock}
                onChange={(e) => setDraft((d) => ({ ...d, stock: e.target.value }))}
                inputMode="numeric"
                className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
                disabled={busy}
              />
            </div>
          </div>

          <div>
            <div className="text-sm font-black text-gray-900 mb-2">Image URL</div>
            <input
              value={draft.imageUrl}
              onChange={(e) => setDraft((d) => ({ ...d, imageUrl: e.target.value }))}
              className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              disabled={busy}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!merchantId) return;
                if (!createGate.ok) {
                  pushToast(createGate.reason ?? "Action not available.");
                  return;
                }
                if (!draft.name.trim()) return;
                setBusy(true);
                try {
                  const nowIso = new Date().toISOString().slice(0, 10);
                  addProduct({
                    name: draft.name.trim(),
                    description: draft.description.trim() || "Product description pending.",
                    price: Number(draft.price) || 0,
                    minOrderQuantity: Math.max(1, Number(draft.minOrderQuantity) || 1),
                    stock: Math.max(0, Number(draft.stock) || 0),
                    categoryId: draft.categoryId,
                    merchantId,
                    merchantName: merchant?.businessName ?? merchant?.storeName ?? "Merchant",
                    images: [draft.imageUrl.trim()],
                    rating: 4.6,
                    reviewsCount: 12,
                    location: merchant ? `${merchant.city}, ${merchant.country}` : "Saudi Arabia",
                    salesCount: 0,
                    createdAt: nowIso,
                    isNewArrival: true,
                  });
                  setCreateOpen(false);
                  setDraft((d) => ({ ...d, name: "", description: "" }));
                  setRefreshKey((k) => k + 1);
                  pushToast("Product added. It is now visible in the marketplace.");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy || !draft.name.trim()}
            >
              Save product
            </Button>
          </div>
        </div>
      </Modal>

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
    </MerchantLayout>
  );
}
