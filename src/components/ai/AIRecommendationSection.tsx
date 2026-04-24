"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getProductRecommendations } from "@/services/aiService";
import { listProducts } from "@/services/productService";
import { listMerchants } from "@/services/adminService";
import { ProductCard } from "@/components/ui/ProductCard";
import { Sparkles, Store } from "lucide-react";

type Props = {
  productId: string;
};

export function AIRecommendationSection({ productId }: Props) {
  const products = useMemo(() => listProducts(), []);
  const merchants = useMemo(() => listMerchants({ status: "all" }), []);
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const merchantById = useMemo(() => new Map(merchants.map((m) => [m.id, m])), [merchants]);

  const [busy, setBusy] = useState(true);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [rec, setRec] = useState<null | { similar: string[]; together: string[]; suppliers: string[] }>(null);

  useEffect(() => {
    let alive = true;
    setBusy(true);
    void getProductRecommendations({ productId, products, limit: 6 }).then((r) => {
      if (!alive) return;
      setRec({ similar: r.similarProductIds, together: r.frequentlyBoughtTogetherProductIds, suppliers: r.recommendedSupplierIds });
      setGeneratedAt(r.meta.generatedAt);
      setBusy(false);
    });
    return () => {
      alive = false;
    };
  }, [productId, products]);

  const similarProducts = useMemo(() => (rec?.similar ?? []).map((id) => productsById.get(id)).filter(Boolean), [productsById, rec]);
  const togetherProducts = useMemo(() => (rec?.together ?? []).map((id) => productsById.get(id)).filter(Boolean), [productsById, rec]);
  const supplierCards = useMemo(() => {
    const ids = rec?.suppliers ?? [];
    const out: Array<{ id: string; name: string; location: string }> = [];
    for (const id of ids) {
      const m = merchantById.get(id);
      if (!m) continue;
      out.push({
        id: m.id,
        name: m.businessName ?? "Supplier",
        location: `${m.city ?? "Saudi Arabia"}`,
      });
    }
    return out.slice(0, 4);
  }, [merchantById, rec]);

  return (
    <Card className="mb-16 overflow-hidden">
      <div className="p-8 border-b border-gray-100/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-xl font-black text-gray-900">AI Recommendations</div>
          <div className="text-sm text-gray-500 mt-1">Similar products, recommended suppliers, and frequently bought together.</div>
          {generatedAt ? <div className="text-[11px] text-gray-500 mt-2">Generated: {new Date(generatedAt).toLocaleString()}</div> : null}
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary-200/70 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-800">
          <Sparkles className="w-4 h-4" />
          Mock AI
        </div>
      </div>
      <CardContent className="p-8 space-y-10">
        {busy ? (
          <div className="rounded-3xl border border-gray-200/60 bg-gray-50 p-8 text-sm font-semibold text-gray-700">AI is thinking...</div>
        ) : (
          <>
            <div>
              <div className="text-sm font-black text-gray-900 mb-4">Similar products</div>
              {similarProducts.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-600">No similar products found.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {similarProducts.slice(0, 6).map((p: any) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-sm font-black text-gray-900 mb-4">Recommended suppliers</div>
              {supplierCards.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-600">No supplier recommendations found.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {supplierCards.map((s) => (
                    <div key={s.id} className="rounded-3xl border border-gray-200/60 bg-white p-6">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-700">
                          <Store className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-black text-gray-900 truncate">{s.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{s.location}</div>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" className="w-full" onClick={() => window.alert("Mock: supplier profile coming soon.")}>
                          View supplier
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-sm font-black text-gray-900 mb-4">Frequently bought together</div>
              {togetherProducts.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-600">No bundles found.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {togetherProducts.slice(0, 4).map((p: any) => (
                    <div key={p.id} className="rounded-3xl border border-gray-200/60 bg-white p-4">
                      <ProductCard product={p} />
                      <div className="mt-3">
                        <Link href={`/products/${p.id}`}>
                          <Button variant="outline" className="w-full">
                            View details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
