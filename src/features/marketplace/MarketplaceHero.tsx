"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CUSTOMER_LOGIN_URL, MERCHANT_LOGIN_URL } from '@/constants/links';
import { useRouter, useSearchParams } from "next/navigation";
import { listProducts } from "@/services/productService";

export const MarketplaceHero = () => {
  const router = useRouter();
  const sp = useSearchParams();
  const [query, setQuery] = useState(sp.get("q") ?? "");
  const [location, setLocation] = useState(sp.get("location") ?? "all");

  const locationOptions = useMemo(() => {
    const products = listProducts();
    return Array.from(new Set(products.map((p) => p.location).filter(Boolean))).sort();
  }, []);

  const runSearch = (next?: { q?: string; location?: string }) => {
    const q = (next?.q ?? query).trim();
    const loc = (next?.location ?? location).trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (loc && loc !== "all") params.set("location", loc);
    router.push(`/marketplace${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <div className="bg-gradient-to-b from-primary-700 via-primary-600 to-primary-500 pt-28 pb-16 md:pt-32 md:pb-20 relative overflow-hidden">
      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      
      <div className="container-max relative z-10">
        <div className="text-center">
          <h1 className="text-white mb-4 text-balance">
            Global sourcing for serious businesses.
          </h1>
          <p className="text-primary-100 max-w-2xl mx-auto text-base md:text-lg">
            Discover verified suppliers, compare minimum order quantities, and buy with confidence across categories.
          </p>
        </div>
        
        {/* Search Bar */}
        <div className="max-w-5xl mx-auto mt-10">
          <div className="bg-white/95 backdrop-blur p-2 rounded-3xl shadow-2xl shadow-gray-900/20 flex flex-col md:flex-row items-center gap-2 border border-white/40">
            <div className="flex-1 w-full flex items-center px-4 border-b md:border-b-0 md:border-r border-gray-200/60">
              <Search className="w-5 h-5 text-gray-400 mr-3" />
              <input 
                type="text" 
                placeholder="Search products, suppliers, or categories" 
                className="w-full py-4 text-gray-700 placeholder:text-gray-400 focus:outline-none bg-transparent"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    runSearch();
                  }
                }}
              />
            </div>
            <div className="w-full md:w-auto flex items-center px-4">
              <MapPin className="w-5 h-5 text-gray-400 mr-3" />
              <select
                className="bg-transparent py-4 text-gray-700 focus:outline-none cursor-pointer w-full md:w-56"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="all">All Locations</option>
                {locationOptions.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <Button size="lg" className="w-full md:w-auto px-10" onClick={() => runSearch()}>
              Search
            </Button>
          </div>
          
          <div className="mt-5 flex flex-wrap justify-center gap-4 text-sm text-primary-100">
            <span className="font-semibold">Popular:</span>
            {['Solar Panels', 'Industrial Pumps', 'Wholesale Cotton', 'Server Racks'].map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setQuery(tag);
                  runSearch({ q: tag });
                }}
                className="hover:text-white underline decoration-primary-400/50"
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={CUSTOMER_LOGIN_URL} className="w-full sm:w-auto">
              <Button variant="secondary" size="md" className="w-full sm:w-auto">
                Customer Login
              </Button>
            </Link>
            <Link href={MERCHANT_LOGIN_URL} className="w-full sm:w-auto">
              <Button variant="outline" size="md" className="w-full sm:w-auto bg-white/10 text-white border-white/30 hover:bg-white/15 hover:border-white/40">
                Merchant Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
