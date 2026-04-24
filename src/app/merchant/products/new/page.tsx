"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MerchantLayout } from "@/features/merchant/MerchantLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { loadSession } from "@/services/authStore";
import { getComplianceConfig, getMerchantById } from "@/services/adminService";
import { addProduct } from "@/services/productService";
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

export default function MerchantNewProductPage() {
  const router = useRouter();
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [teamRole, setTeamRole] = useState<"admin" | "manager" | "viewer">("admin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const session = loadSession();
    if (!session || session.user.role !== "MERCHANT") return;
    setMerchantId(session.user.merchantParentId ?? session.user.id);
    setTeamRole((session.user.merchantTeamRole ?? "admin") as any);
  }, []);

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

  return (
    <MerchantLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">New product</h1>
          <p className="text-gray-500">Create a product using mock data only.</p>
        </div>
        <Link href="/merchant/products">
          <Button variant="outline">Back to products</Button>
        </Link>
      </div>

      {!createGate.ok && (
        <div className="mb-6 rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          {createGate.reason}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200/70 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <Card>
        <div className="p-6 border-b border-gray-100/60">
          <div className="text-lg font-black text-gray-900">Product details</div>
        </div>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-black text-gray-900 mb-2">Name</div>
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
              rows={5}
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

          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
            <Link href="/merchant/products">
              <Button variant="outline" disabled={busy}>
                Cancel
              </Button>
            </Link>
            <Button
              disabled={busy || !merchantId || !createGate.ok || !draft.name.trim()}
              onClick={() => {
                if (!merchantId) return;
                if (!createGate.ok) return;
                setBusy(true);
                setError(null);
                try {
                  const nowIso = new Date().toISOString().slice(0, 10);
                  const created = addProduct({
                    name: draft.name.trim(),
                    description: draft.description.trim() || "Product description",
                    price: Number(draft.price) || 100,
                    minOrderQuantity: Math.max(1, Number(draft.minOrderQuantity) || 1),
                    stock: Math.max(0, Number(draft.stock) || 0),
                    images: [draft.imageUrl.trim()],
                    categoryId: draft.categoryId,
                    merchantId,
                    merchantName: merchant?.businessName ?? "Merchant",
                    location: merchant?.city ?? "Saudi Arabia",
                    rating: 4.6,
                    reviewsCount: 0,
                    salesCount: 0,
                    createdAt: nowIso,
                  });
                  router.push(`/merchant/products/${created.id}`);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to create product.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Create product
            </Button>
          </div>
        </CardContent>
      </Card>
    </MerchantLayout>
  );
}
