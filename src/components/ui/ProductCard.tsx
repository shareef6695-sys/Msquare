import React from 'react';
import Image from 'next/image';
import { Star, MapPin, ShoppingCart } from 'lucide-react';
import { Product } from '@/types';
import { Card, CardContent } from './Card';
import { Button } from './Button';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  return (
    <Card className="group overflow-hidden flex flex-col h-full">
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={product.images[0]}
          alt={product.name}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
        />
        {product.isNewArrival && (
          <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
            NEW
          </span>
        )}
      </div>
      
      <CardContent className="flex-1 flex flex-col p-4">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-medium text-primary-600 uppercase tracking-wider">
            {product.merchantName}
          </span>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-semibold">{product.rating}</span>
          </div>
        </div>
        
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 min-h-[3rem]">
          {product.name}
        </h3>
        
        <div className="mt-auto">
          <div className="flex items-center gap-1 text-gray-500 text-xs mb-2">
            <MapPin className="w-3 h-3" />
            <span>{product.location}</span>
          </div>
          
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-lg font-bold text-gray-900">${product.price.toFixed(2)}</span>
            <span className="text-xs text-gray-500">/ unit</span>
          </div>
          
          <div className="text-xs text-gray-500 mb-4">
            Min. Order: <span className="font-semibold text-gray-900">{product.minOrderQuantity} units</span>
          </div>
          
          <Button className="w-full gap-2" variant="outline" size="sm">
            <ShoppingCart className="w-4 h-4" />
            View Product
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
