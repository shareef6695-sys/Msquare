"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { searchProductsWithAI } from "@/services/aiService";
import { ProductCard } from "@/components/ui/ProductCard";
import { listProducts } from "@/services/productService";
import { MOCK_CATEGORIES } from "@/data/mockCategories";
import { Sparkles } from "lucide-react";

type MatchView = {
  productId: string;
  score: number;
  reasons: string[];
};

export function AISearchBox() {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchView[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const products = useMemo(() => listProducts(), []);
  const categoriesById = useMemo(() => Object.fromEntries(MOCK_CATEGORIES.map((c) => [c.id, { name: c.name }])), []);
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const run = async () => {
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    setError(null);
    try {
      const r = await searchProductsWithAI({ query: q, products, categoriesById, limit: 6 });
      setSummary(r.summary);
      setMatches(r.matches);
      setGeneratedAt(r.meta.generatedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI search failed.");
    } finally {
      setBusy(false);
    }
  };

  const resolved = useMemo(() => {
    return matches
      .map((m) => ({ match: m, product: productsById.get(m.productId) }))
      .filter((x): x is { match: MatchView; product: any } => Boolean(x.product));
  }, [matches, productsById]);

  return (
    <Card className="overflow-hidden">
      <div className="p-6 border-b border-gray-100/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-lg font-black text-gray-900">AI Search</div>
          <div className="text-sm text-gray-500 mt-1">Tell us what you’re looking for and get instant recommendations.</div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary-200/70 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-800">
          <Sparkles className="w-4 h-4" />
          Mock AI
        </div>
      </div>
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void run();
              }
            }}
            className="flex-1 rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="Tell us what you are looking for..."
            disabled={busy}
          />
          <Button disabled={busy || !query.trim()} onClick={() => void run()} className="whitespace-nowrap">
            {busy ? "AI is thinking..." : "Search with AI"}
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              setQuery("");
              setSummary(null);
              setMatches([]);
              setGeneratedAt(null);
              setError(null);
            }}
          >
            Clear
          </Button>
        </div>

        {error && <div className="mt-4 rounded-2xl border border-red-200/70 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

        {summary && (
          <div className="mt-4 rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <div className="font-semibold text-gray-900">Why these products?</div>
            <div className="mt-1">{summary}</div>
            {generatedAt ? <div className="mt-2 text-[11px] text-gray-500">Generated: {new Date(generatedAt).toLocaleString()}</div> : null}
          </div>
        )}

        {resolved.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {resolved.map(({ product, match }) => (
              <div key={product.id} className="rounded-3xl border border-gray-200/60 bg-white p-4">
                <ProductCard product={product} />
                <div className="mt-3 rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Match</div>
                  <div className="mt-1 text-sm font-semibold text-gray-800">Score: {match.score}</div>
                  <div className="mt-2 text-xs text-gray-600 space-y-1">
                    {match.reasons.slice(0, 4).map((r) => (
                      <div key={r}>• {r}</div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : summary && !busy ? (
          <div className="mt-6 rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
            <div className="text-lg font-black text-gray-900">No strong matches</div>
            <div className="text-sm text-gray-500 mt-2">Try including a material, industry, location, or MOQ.</div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

