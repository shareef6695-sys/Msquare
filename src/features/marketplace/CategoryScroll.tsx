import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MOCK_CATEGORIES } from '@/data/mockCategories';

export const CategoryScroll = () => {
  return (
    <section className="py-14 bg-white">
      <div className="container-max">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-gray-900">Popular Categories</h2>
            <p className="text-sm text-gray-500 mt-1">Browse by industry and discover verified suppliers.</p>
          </div>
          <Link href="/marketplace" className="text-primary-700 font-semibold hover:text-primary-800 text-sm">
            View All
          </Link>
        </div>
        
        <div className="flex overflow-x-auto gap-4 pb-2 no-scrollbar snap-x snap-mandatory">
          {MOCK_CATEGORIES.map((category) => (
            <Link
              key={category.id}
              href={`/marketplace?category=${category.slug}`}
              className="flex-shrink-0 snap-start w-52 sm:w-60 group"
            >
              <div className="relative overflow-hidden rounded-2xl border border-gray-200/60 bg-gray-50 shadow-sm shadow-gray-900/5 group-hover:shadow-md transition-all duration-300">
                <div className="relative h-24 sm:h-28">
                  <Image
                    src={category.image || ''}
                    alt={category.name}
                    fill
                    className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    sizes="240px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-gray-900/10 to-transparent" />
                </div>
                <div className="p-4">
                  <div className="text-sm font-bold text-gray-900 group-hover:text-primary-700 transition-colors">
                    {category.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Explore products and suppliers</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
