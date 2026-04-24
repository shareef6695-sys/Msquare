"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MarketplaceHero } from "@/features/marketplace/MarketplaceHero";
import { CategoryScroll } from "@/features/marketplace/CategoryScroll";
import { ProductSection } from "@/features/marketplace/ProductSection";
import { Button } from "@/components/ui/Button";
import { CheckCircle2 } from "lucide-react";
import { CUSTOMER_LOGIN_URL, MERCHANT_LOGIN_URL } from "@/constants/links";
import { MOCK_CATEGORIES } from "@/data/mockCategories";
import {
  getFeaturedProducts,
  getNewProducts,
  getRecommendedProducts,
  getTopSellingProducts,
  listProducts,
} from "@/services/productService";
import { ProductCard } from "@/components/ui/ProductCard";

export default function MarketplacePage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [draftQ, setDraftQ] = useState(sp.get("q") ?? "");
  const [draftCategory, setDraftCategory] = useState(sp.get("category") ?? "all");
  const [draftLocation, setDraftLocation] = useState(sp.get("location") ?? "all");
  const [draftMinPrice, setDraftMinPrice] = useState(sp.get("minPrice") ?? "");
  const [draftMaxPrice, setDraftMaxPrice] = useState(sp.get("maxPrice") ?? "");
  const [draftMoq, setDraftMoq] = useState(sp.get("moq") ?? "");
  const [draftSort, setDraftSort] = useState(
    (sp.get("sort") as "newest" | "top_selling" | "price_asc" | "price_desc" | null) ?? "newest",
  );

  const allProducts = useMemo(() => listProducts(), []);
  const categoryById = useMemo(() => new Map(MOCK_CATEGORIES.map((c) => [c.id, c])), []);

  const locationOptions = useMemo(() => {
    return Array.from(new Set(allProducts.map((p) => p.location).filter(Boolean))).sort();
  }, [allProducts]);

  const applyBrowseParams = (next?: {
    q?: string;
    category?: string;
    location?: string;
    minPrice?: string;
    maxPrice?: string;
    moq?: string;
    sort?: string;
  }) => {
    const params = new URLSearchParams(sp.toString());
    const setOrClear = (key: string, value: string | undefined, empty = "all") => {
      const v = (value ?? "").trim();
      if (!v || v === empty) params.delete(key);
      else params.set(key, v);
    };
    setOrClear("q", next?.q ?? draftQ, "");
    setOrClear("category", next?.category ?? draftCategory, "all");
    setOrClear("location", next?.location ?? draftLocation, "all");
    setOrClear("minPrice", next?.minPrice ?? draftMinPrice, "");
    setOrClear("maxPrice", next?.maxPrice ?? draftMaxPrice, "");
    setOrClear("moq", next?.moq ?? draftMoq, "");
    setOrClear("sort", next?.sort ?? draftSort, "");
    router.replace(`/marketplace${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const browseProducts = useMemo(() => {
    let result = [...allProducts];

    const q = (sp.get("q") ?? "").trim().toLowerCase();
    const category = (sp.get("category") ?? "").trim().toLowerCase();
    const location = (sp.get("location") ?? "").trim().toLowerCase();
    const minPrice = Number(sp.get("minPrice"));
    const maxPrice = Number(sp.get("maxPrice"));
    const moq = Number(sp.get("moq"));
    const sort = (sp.get("sort") ?? "newest") as "newest" | "top_selling" | "price_asc" | "price_desc";

    if (category) {
      const categoryObj = MOCK_CATEGORIES.find((c) => c.slug === category);
      const categoryId = categoryObj?.id;
      if (categoryId) result = result.filter((p) => p.categoryId === categoryId);
    }

    if (location) {
      result = result.filter((p) => p.location.toLowerCase() === location);
    }

    if (!Number.isNaN(minPrice)) result = result.filter((p) => p.price >= minPrice);
    if (!Number.isNaN(maxPrice)) result = result.filter((p) => p.price <= maxPrice);
    if (!Number.isNaN(moq)) result = result.filter((p) => p.minOrderQuantity >= moq);

    if (q) {
      result = result.filter((p) => {
        const categoryName = categoryById.get(p.categoryId)?.name ?? "";
        const hay = `${p.name} ${p.merchantName} ${categoryName} ${p.location}`.toLowerCase();
        return hay.includes(q);
      });
    }

    if (sort === "top_selling") result.sort((a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0));
    else if (sort === "price_asc") result.sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") result.sort((a, b) => b.price - a.price);
    else result.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());

    return result;
  }, [allProducts, categoryById, sp]);

  const featuredProducts = getFeaturedProducts();
  const topSellingProducts = getTopSellingProducts().slice(0, 8);
  const newArrivals = getNewProducts().slice(0, 8);
  const recommendedProducts = getRecommendedProducts().slice(0, 4);
  const categorySpotlight = MOCK_CATEGORIES.slice(0, 3);
  const trustHighlights = [
    "Secure Payment (Escrow)",
    "LC Payment Accepted",
    "Shipment Insurance Available",
    "Buyer Protection",
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      <MarketplaceHero />
      <CategoryScroll />

      <section className="py-10">
          <div className="container-max">
            <div className="rounded-3xl border border-gray-200/60 bg-white shadow-sm shadow-gray-900/5 overflow-hidden">
              <div className="p-6 border-b border-gray-100/60">
                <div className="text-lg font-black text-gray-900">Browse Products</div>
                <div className="text-sm text-gray-500 mt-1">Search by product name, category, supplier, and location.</div>
              </div>
              <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Search</div>
                  <input
                    value={draftQ}
                    onChange={(e) => setDraftQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyBrowseParams();
                      }
                    }}
                    className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="Product, category, or supplier…"
                  />
                </div>
                <div className="lg:col-span-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Category</div>
                  <select
                    value={draftCategory}
                    onChange={(e) => setDraftCategory(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
                  >
                    <option value="all">All categories</option>
                    {MOCK_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Location</div>
                  <select
                    value={draftLocation}
                    onChange={(e) => setDraftLocation(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
                  >
                    <option value="all">All locations</option>
                    {locationOptions.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="lg:col-span-1">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">MOQ</div>
                  <input
                    value={draftMoq}
                    onChange={(e) => setDraftMoq(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
                    placeholder="Min"
                    inputMode="numeric"
                  />
                </div>
                <div className="lg:col-span-1">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Min</div>
                  <input
                    value={draftMinPrice}
                    onChange={(e) => setDraftMinPrice(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
                    placeholder="$"
                    inputMode="decimal"
                  />
                </div>
                <div className="lg:col-span-1">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Max</div>
                  <input
                    value={draftMaxPrice}
                    onChange={(e) => setDraftMaxPrice(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
                    placeholder="$"
                    inputMode="decimal"
                  />
                </div>
                <div className="lg:col-span-1">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Sort</div>
                  <select
                    value={draftSort}
                    onChange={(e) => setDraftSort(e.target.value as any)}
                    className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
                  >
                    <option value="newest">Newest</option>
                    <option value="top_selling">Top selling</option>
                    <option value="price_asc">Price: low → high</option>
                    <option value="price_desc">Price: high → low</option>
                  </select>
                </div>
                <div className="lg:col-span-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-black text-gray-900">{browseProducts.length}</span> products
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDraftQ("");
                        setDraftCategory("all");
                        setDraftLocation("all");
                        setDraftMinPrice("");
                        setDraftMaxPrice("");
                        setDraftMoq("");
                        setDraftSort("newest");
                        router.replace("/marketplace");
                      }}
                    >
                      Clear
                    </Button>
                    <Button onClick={() => applyBrowseParams()}>Apply</Button>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100/60">
                {browseProducts.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
                    <div className="text-lg font-black text-gray-900">No results</div>
                    <div className="text-sm text-gray-500 mt-2">Try adjusting filters or search keywords.</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {browseProducts.map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      
      <ProductSection 
        title="Featured Products" 
        subtitle="Handpicked quality items from top-tier suppliers"
        products={featuredProducts} 
        actionHref="/marketplace"
      />

      <section className="py-12 bg-white">
        <div className="container-max">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trustHighlights.map((item) => (
              <div
                key={item}
                className="flex items-start gap-4 rounded-2xl border border-gray-200/60 bg-gray-50/60 px-6 py-5"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="text-sm font-semibold text-gray-900">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-gradient-to-r from-gray-950 to-primary-950 text-white">
        <div className="container-max flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="text-white mb-3">Are you a Supplier?</h2>
            <p className="text-primary-200 text-lg">
              Join thousands of merchants already selling on MSquare. 
              Get access to millions of buyers worldwide with our premium seller tools.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Link href={MERCHANT_LOGIN_URL} className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-white text-gray-950 hover:bg-gray-100 whitespace-nowrap">
                Merchant Login
              </Button>
            </Link>
            <Link href={CUSTOMER_LOGIN_URL} className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/30 text-white bg-white/10 hover:bg-white/15 hover:border-white/40 whitespace-nowrap">
                Customer Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <ProductSection 
        title="Top Selling" 
        subtitle="The most popular items in our marketplace right now"
        products={topSellingProducts} 
        actionHref="/marketplace"
      />

      <ProductSection 
        title="New Arrivals" 
        subtitle="Discover the latest products added to our catalog"
        products={newArrivals} 
        actionHref="/marketplace"
      />

      <ProductSection
        title="Recommended for You"
        subtitle="Top-rated items curated from trusted suppliers"
        products={recommendedProducts}
        actionHref="/marketplace"
      />

      <section className="py-16">
        <div className="container-max">
          <div className="mb-10 flex items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-gray-900 mb-2">Products by Category</h2>
              <p className="text-gray-500">Explore selected inventory across key industries.</p>
            </div>
            <Link href="/marketplace" className="text-sm font-semibold text-primary-700 hover:text-primary-800">
              Browse all
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {categorySpotlight.map((cat) => {
              const products = allProducts.filter((p) => p.categoryId === cat.id).slice(0, 4);
              return (
                <div key={cat.id} className="rounded-3xl border border-gray-200/60 bg-white p-6 shadow-sm shadow-gray-900/5">
                  <div className="flex items-center justify-between mb-5">
                    <div className="text-lg font-black text-gray-900">{cat.name}</div>
                    <Link href={`/marketplace?category=${cat.slug}`} className="text-sm font-semibold text-primary-700 hover:text-primary-800">
                      View
                    </Link>
                  </div>
                  <div className="space-y-4">
                    {products.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
                        No items available yet.
                      </div>
                    ) : (
                      products.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{p.name}</div>
                            <div className="text-xs text-gray-500 mt-1">MOQ {p.minOrderQuantity} • {p.location}</div>
                          </div>
                          <div className="text-sm font-black text-gray-900">${p.price.toFixed(2)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Supplier Highlight Section */}
      <section className="py-20">
        <div className="container-max">
          <div className="mb-12 flex items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-gray-900 mb-2">Top Rated Suppliers</h2>
              <p className="text-gray-500">Verified partners with consistent fulfillment and high ratings.</p>
            </div>
            <Link href={MERCHANT_LOGIN_URL} className="hidden sm:block">
              <Button variant="outline" size="sm">Become a Supplier</Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { name: 'TechCorp Industrial', location: 'Germany', products: 1240, rating: 4.9 },
              { name: 'Global Machinery', location: 'UAE', products: 850, rating: 4.8 },
              { name: 'Fashion Hub', location: 'Turkey', products: 3200, rating: 4.7 }
            ].map((supplier) => (
              <div key={supplier.name} className="bg-white p-7 rounded-3xl border border-gray-200/60 shadow-sm shadow-gray-900/5 hover:shadow-md transition-all duration-300">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl border border-gray-200/60" />
                    <div>
                      <h3 className="text-lg font-black text-gray-900">{supplier.name}</h3>
                      <p className="text-gray-500 text-sm mt-1">{supplier.location} • {supplier.products} products</p>
                    </div>
                  </div>
                  <div className="rounded-full bg-green-50 text-green-700 border border-green-200/60 px-3 py-1 text-xs font-bold">
                    Verified
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-yellow-500 text-sm font-black">
                    <span>★</span> {supplier.rating}
                    <span className="text-gray-400 font-semibold">/ 5</span>
                  </div>
                  <Button variant="outline" size="sm">View Supplier</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
