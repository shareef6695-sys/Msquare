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
import { AIProductGenerator } from "@/components/ai/AIProductGenerator";
import { evaluateProductCompliance } from "@/services/productComplianceService";
import { supabase } from "@/lib/supabase";

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

const sanitizeFilename = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.\-_]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 120) || "image";

export default function MerchantNewProductPage() {
  const router = useRouter();
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [teamRole, setTeamRole] = useState<"admin" | "manager" | "viewer">("admin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [draft, setDraft] = useState({
    name: "",
    description: "",
    price: "100",
    minOrderQuantity: "10",
    stock: "100",
    categoryId: MOCK_CATEGORIES[0]?.id ?? "c1",
    imageUrl: "https://via.placeholder.com/600x450.png?text=MSquare+Product",
    saberCertified: false,
    fasahDeclared: false,
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

  const saudiCompliance = useMemo(() => {
    const dryRunId = "draft_product";
    return evaluateProductCompliance(
      {
        id: dryRunId,
        name: draft.name.trim() || "Draft product",
        description: draft.description.trim() || "",
        price: Number(draft.price) || 0,
        minOrderQuantity: Math.max(1, Number(draft.minOrderQuantity) || 1),
        stock: Math.max(0, Number(draft.stock) || 0),
        images: [draft.imageUrl.trim() || "https://via.placeholder.com/600x450.png?text=MSquare+Product"],
        categoryId: draft.categoryId,
        merchantId: merchantId ?? "merchant_draft",
        merchantName: merchant?.businessName ?? "Merchant",
        location: merchant?.city ?? "Saudi Arabia",
        rating: 0,
        reviewsCount: 0,
        salesCount: 0,
        compliance: {
          saberCertified: draft.saberCertified,
          fasahDeclared: draft.fasahDeclared,
        },
      },
      "Saudi Arabia",
    );
  }, [draft, merchant?.businessName, merchant?.city, merchantId]);

  const uploadProductImage = async (file: File) => {
    if (!merchantId) throw new Error("Merchant account not found.");
    if (!file.type.startsWith("image/")) throw new Error("Please select an image file.");
    if (file.size > 10 * 1024 * 1024) throw new Error("Image is too large. Max size is 10MB.");
    const ext = (() => {
      const raw = file.name.split(".").pop();
      const cleaned = raw ? raw.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
      return cleaned ? `.${cleaned}` : "";
    })();
    const base = sanitizeFilename(file.name.replace(/\.[^/.]+$/, ""));
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
    const path = `merchants/${merchantId}/${base}-${id}${ext || ".png"}`;

    const res = await supabase.storage.from("product-images").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

    if (res.error) throw new Error(res.error.message);

    const pub = supabase.storage.from("product-images").getPublicUrl(path);
    const url = pub.data.publicUrl;
    if (!url) throw new Error("Upload succeeded, but public URL was not returned.");
    return url;
  };

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

          <AIProductGenerator
            productName={draft.name}
            description={draft.description}
            categoryId={draft.categoryId}
            categories={MOCK_CATEGORIES}
            disabled={busy}
            onApply={(next) => {
              setDraft((d) => ({
                ...d,
                name: next.name ?? d.name,
                description: next.description ?? d.description,
              }));
            }}
            onApplyCategory={(nextCategoryId) => setDraft((d) => ({ ...d, categoryId: nextCategoryId }))}
          />

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
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <input
                type="file"
                accept="image/*"
                className="w-full sm:max-w-sm rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
                disabled={busy || uploadBusy || !merchantId || !createGate.ok}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadBusy(true);
                  setUploadError(null);
                  try {
                    const url = await uploadProductImage(file);
                    setDraft((d) => ({ ...d, imageUrl: url }));
                  } catch (err) {
                    setUploadError(err instanceof Error ? err.message : "Failed to upload image.");
                  } finally {
                    setUploadBusy(false);
                    e.target.value = "";
                  }
                }}
              />
              <div className="text-xs font-semibold text-gray-500">
                Upload to Supabase Storage (bucket: product-images)
              </div>
            </div>
            {uploadError && (
              <div className="mt-3 rounded-2xl border border-red-200/70 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {uploadError}
              </div>
            )}
            {uploadBusy && (
              <div className="mt-3 rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                Uploading image…
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-5 py-4">
            <div className="text-sm font-black text-gray-900">Saudi compliance declarations</div>
            <div className="mt-3 space-y-3">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/70 bg-white px-4 py-3 text-sm font-semibold text-gray-700">
                <span>SABER certification available</span>
                <input
                  type="checkbox"
                  checked={draft.saberCertified}
                  onChange={(e) => setDraft((d) => ({ ...d, saberCertified: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  disabled={busy}
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/70 bg-white px-4 py-3 text-sm font-semibold text-gray-700">
                <span>FASAH declaration available</span>
                <input
                  type="checkbox"
                  checked={draft.fasahDeclared}
                  onChange={(e) => setDraft((d) => ({ ...d, fasahDeclared: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  disabled={busy}
                />
              </label>
            </div>
          </div>

          {!saudiCompliance.passed && (
            <div className="rounded-2xl border border-red-200/70 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              <div className="font-black">Product compliance violations (Saudi Arabia)</div>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                {saudiCompliance.violations.map((v, idx) => (
                  <li key={`${v.code}_${idx}`}>
                    {v.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

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
                  if (!saudiCompliance.passed) {
                    throw new Error("Product compliance violations detected for Saudi Arabia (SABER/FASAH/category rules).");
                  }
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
                    compliance: {
                      saberCertified: draft.saberCertified,
                      fasahDeclared: draft.fasahDeclared,
                    },
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
