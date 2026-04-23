import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Star } from 'lucide-react';
import { Product } from '@/types';
import { Card, CardContent } from './Card';
import { Button } from './Button';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  return (
    <Card className="group overflow-hidden flex flex-col h-full bg-white">
      <div className="relative overflow-hidden bg-gray-100">
        <Link href={`/products/${product.id}`} className="block">
          <div className="relative aspect-[4/3]">
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 via-gray-900/0 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
          </div>
        </Link>

        <div className="absolute top-3 left-3 flex items-center gap-2">
          {product.isFeatured && (
            <span className="bg-white/90 backdrop-blur px-2.5 py-1 rounded-full text-[11px] font-bold text-gray-900 border border-gray-200/60">
              Featured
            </span>
          )}
          {product.isNewArrival && (
            <span className="bg-green-600/90 backdrop-blur px-2.5 py-1 rounded-full text-[11px] font-bold text-white">
              New
            </span>
          )}
        </div>
      </div>
      
      <CardContent className="flex-1 flex flex-col p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-primary-700 uppercase tracking-wider">
              {product.merchantName}
            </div>
            <Link href={`/products/${product.id}`} className="block">
              <h3 className="mt-1 font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-primary-800 transition-colors">
                {product.name}
              </h3>
            </Link>
          </div>

          <div className="flex items-center gap-1 rounded-full border border-gray-200/60 bg-white px-2 py-1">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-bold text-gray-900">{product.rating}</span>
            <span className="text-[11px] text-gray-500">({product.reviewsCount})</span>
          </div>
        </div>
        
        <div className="mt-auto">
          <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-3">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">{product.location}</span>
          </div>
          
          <div className="flex items-end justify-between gap-3 mb-4">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-gray-900">${product.price.toFixed(2)}</span>
                <span className="text-xs text-gray-500">/ unit</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Min. Order: <span className="font-semibold text-gray-900">{product.minOrderQuantity} units</span>
              </div>
            </div>
            <div className="text-right text-xs text-gray-500">
              Stock: <span className="font-semibold text-gray-900">{product.stock}</span>
            </div>
          </div>
          
          <Link href={`/products/${product.id}`}>
            <Button className="w-full" variant="outline" size="sm">
              View Product
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
