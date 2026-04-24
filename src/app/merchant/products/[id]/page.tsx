"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { MerchantLayout } from "@/features/merchant/MerchantLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { loadSession } from "@/services/authStore";
import { listProducts } from "@/services/productService";
import { MOCK_CATEGORIES } from "@/data/mockCategories";

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
};

export default function MerchantProductDetailsPage() {
  const params = useParams<{ id: string }>();
  const productId = params?.id;
  const [merchantId, setMerchantId] = useState<string | null>(null);

  useEffect(() => {
    const session = loadSession();
    if (!session || session.user.role !== "MERCHANT") return;
    setMerchantId(session.user.merchantParentId ?? session.user.id);
  }, []);

  const product = useMemo(() => {
    if (!productId) return null;
    const p = listProducts().find((x) => x.id === productId) ?? null;
    if (!p) return null;
    if (merchantId && p.merchantId !== merchantId) return null;
    return p;
  }, [merchantId, productId]);

  const heroImage = product?.images?.[0] || "https://via.placeholder.com/1200x675.png?text=MSquare+Product";
  const categoryName = product ? MOCK_CATEGORIES.find((c) => c.id === product.categoryId)?.name ?? "Category" : "Category";

  return (
    <MerchantLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-gray-900 truncate">Product details</h1>
          <p className="text-gray-500 truncate">{productId}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link href="/merchant/products">
            <Button variant="outline">Back to products</Button>
          </Link>
          {product && (
            <Link href={`/products/${product.id}`}>
              <Button>View in marketplace</Button>
            </Link>
          )}
        </div>
      </div>

      {!product ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
          <div className="text-lg font-black text-gray-900">Product not found</div>
          <div className="text-sm text-gray-500 mt-2">This product may not exist or does not belong to your merchant account.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 overflow-hidden">
            <div className="relative aspect-[16/9] bg-gray-50 border-b border-gray-100/60">
              <Image src={heroImage} alt={product.name} fill className="object-cover" unoptimized />
            </div>
            <CardContent className="p-6">
              <div className="text-xl font-black text-gray-900">{product.name}</div>
              <div className="text-sm text-gray-500 mt-2">{product.description}</div>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Price</div>
                  <div className="text-lg font-black text-gray-900 mt-1">{formatMoney(product.price)}</div>
                </div>
                <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">MOQ</div>
                  <div className="text-lg font-black text-gray-900 mt-1">{product.minOrderQuantity}</div>
                </div>
                <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Stock</div>
                  <div className="text-lg font-black text-gray-900 mt-1">{product.stock}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <div className="p-6 border-b border-gray-100/60">
                <div className="text-lg font-black text-gray-900">Details</div>
              </div>
              <CardContent className="p-6 space-y-3">
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800">
                  Category: <span className="font-black text-gray-900">{categoryName}</span>
                </div>
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800">
                  Location: <span className="font-black text-gray-900">{product.location}</span>
                </div>
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800">
                  Created: <span className="font-black text-gray-900">{product.createdAt ?? "—"}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </MerchantLayout>
  );
}
