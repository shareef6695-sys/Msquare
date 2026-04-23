import React from 'react';
import Link from 'next/link';
import { ProductCard } from '@/components/ui/ProductCard';
import { Product } from '@/types';

interface ProductSectionProps {
  title: string;
  products: Product[];
  subtitle?: string;
  actionHref?: string;
  actionLabel?: string;
}

export const ProductSection = ({ title, products, subtitle, actionHref, actionLabel }: ProductSectionProps) => {
  return (
    <section className="py-16">
      <div className="container-max">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-gray-900 mb-2">{title}</h2>
            {subtitle && <p className="text-gray-500">{subtitle}</p>}
          </div>
          {actionHref && (
            <Link href={actionHref} className="text-sm font-semibold text-primary-700 hover:text-primary-800">
              {actionLabel || 'View all'}
            </Link>
          )}
        </div>
        
        {products.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center">
            <div className="text-lg font-bold text-gray-900">No products yet</div>
            <div className="text-sm text-gray-500 mt-2">Check back soon — new inventory is added daily.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
