import React from 'react';
import { ProductCard } from '@/components/ui/ProductCard';
import { Product } from '@/types';

interface ProductSectionProps {
  title: string;
  products: Product[];
  subtitle?: string;
}

export const ProductSection = ({ title, products, subtitle }: ProductSectionProps) => {
  return (
    <section className="py-16">
      <div className="container-max">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>
          {subtitle && <p className="text-gray-500">{subtitle}</p>}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};
