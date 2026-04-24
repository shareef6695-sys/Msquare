import React from 'react';
import Image from 'next/image';
import { MOCK_PRODUCTS } from '@/data/mockProducts';
import { Button } from '@/components/ui/Button';
import { AlertCircle, FileText, Star, MapPin, ShieldCheck, Truck, ShoppingCart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

export default function ProductDetailsPage({ params }: { params: { id: string } }) {
  const product = MOCK_PRODUCTS.find(p => p.id === params.id) || MOCK_PRODUCTS[0];

  return (
    <div className="bg-white min-h-screen pt-24 pb-20">
      <div className="container-max">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-gray-100 border border-gray-200/60">
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 600px"
              />
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-200/60 cursor-pointer hover:opacity-90 transition-opacity">
                  <Image src={product.images[0]} alt="" fill className="object-cover" sizes="150px" />
                </div>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-bold text-primary-600 uppercase tracking-widest">{product.merchantName}</span>
              <div className="h-4 w-px bg-gray-200" />
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-bold">{product.rating}</span>
                <span className="text-sm text-gray-500">({product.reviewsCount} reviews)</span>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">{product.name}</h1>
            
            <div className="bg-gray-50 p-6 rounded-2xl mb-8">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-gray-900">${product.price.toFixed(2)}</span>
                <span className="text-gray-500">/ unit</span>
              </div>
              <p className="text-sm text-gray-600">Minimum Order: <span className="font-bold text-gray-900">{product.minOrderQuantity} units</span></p>
            </div>

            <div className="space-y-6 mb-10">
              <p className="text-gray-600 leading-relaxed">
                {product.description}
              </p>
              
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <MapPin className="w-5 h-5 text-gray-400" />
                <span>Ships from: <span className="font-semibold text-gray-900">{product.location}</span></span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <div className="flex items-center border border-gray-200 rounded-lg">
                <button className="px-4 py-2 hover:bg-gray-50 transition-colors">-</button>
                <input type="number" defaultValue={product.minOrderQuantity} className="w-16 text-center focus:outline-none" />
                <button className="px-4 py-2 hover:bg-gray-50 transition-colors">+</button>
              </div>
              <Button size="lg" className="flex-1 gap-2">
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-8 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-green-600" />
                <span className="text-xs font-medium text-gray-600">Trade Assurance</span>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-blue-600" />
                <span className="text-xs font-medium text-gray-600">LC Payment Accepted</span>
              </div>
              <div className="flex items-center gap-3">
                <Truck className="w-6 h-6 text-emerald-600" />
                <span className="text-xs font-medium text-gray-600">Protected Shipment</span>
              </div>
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600" />
                <span className="text-xs font-medium text-gray-600">Buyer Protection</span>
              </div>
            </div>
          </div>
        </div>

        {/* Merchant Info Section */}
        <Card className="mb-16">
          <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{product.merchantName}</h3>
                <p className="text-gray-500 text-sm mb-4">Verified Gold Supplier • 5 Years on MSquare</p>
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-900">4.9/5</p>
                    <p className="text-xs text-gray-500 uppercase tracking-tighter font-semibold">Rating</p>
                  </div>
                  <div className="text-center border-l border-gray-100 pl-4">
                    <p className="text-sm font-bold text-gray-900">98%</p>
                    <p className="text-xs text-gray-500 uppercase tracking-tighter font-semibold">Response</p>
                  </div>
                  <div className="text-center border-l border-gray-100 pl-4">
                    <p className="text-sm font-bold text-gray-900">12k+</p>
                    <p className="text-xs text-gray-500 uppercase tracking-tighter font-semibold">Orders</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Button variant="outline">Contact Supplier</Button>
              <Button variant="secondary">Visit Store</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
