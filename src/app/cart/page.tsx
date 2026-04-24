"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { getResolvedCartItems, removeFromCart, updateCartQuantity } from "@/services/cartStore";

export default function CartPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const resolved = getResolvedCartItems();
  const cartItems = resolved.items;
  const subtotal = resolved.subtotal;
  const tax = subtotal * 0.1;
  const shipping = cartItems.length > 0 ? Math.min(120, Math.max(25, subtotal * 0.02)) : 0;
  const total = subtotal + tax + shipping;

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "msquare.cart.v1") setRefreshKey((k) => k + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen pt-24 pb-20">
      <div className="container-max">
        <h1 className="text-3xl font-bold mb-10">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <Card key={item.productId}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="w-full sm:w-32 h-32 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200/60 relative">
                      <Image
                        src={item.product.images[0]}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                        sizes="128px"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-gray-900">{item.product.name}</h3>
                          <p className="text-sm text-primary-600 font-medium">{item.product.merchantName}</p>
                        </div>
                        <button
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          onClick={() => {
                            removeFromCart(item.productId);
                            setRefreshKey((k) => k + 1);
                          }}
                          aria-label="Remove"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
                        <div className="flex items-center border border-gray-200 rounded-lg bg-white">
                          <button
                            className="px-3 py-1 hover:bg-gray-50"
                            onClick={() => {
                              updateCartQuantity(item.productId, Math.max(item.product.minOrderQuantity, item.quantity - 1));
                              setRefreshKey((k) => k + 1);
                            }}
                            aria-label="Decrease"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            min={item.product.minOrderQuantity}
                            onChange={(e) => {
                              updateCartQuantity(item.productId, Math.max(item.product.minOrderQuantity, Number(e.target.value)));
                              setRefreshKey((k) => k + 1);
                            }}
                            className="w-16 text-center text-sm font-bold focus:outline-none"
                          />
                          <button
                            className="px-3 py-1 hover:bg-gray-50"
                            onClick={() => {
                              updateCartQuantity(item.productId, item.quantity + 1);
                              setRefreshKey((k) => k + 1);
                            }}
                            aria-label="Increase"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">${(item.product.price * item.quantity).toFixed(2)}</p>
                          <p className="text-xs text-gray-500">${item.product.price.toFixed(2)} / unit</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {cartItems.length === 0 && (
              <div className="bg-white p-20 rounded-3xl border border-dashed border-gray-200 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShoppingBag className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Your cart is empty</h3>
                <p className="text-gray-500 mb-8">Looks like you haven’t added anything to your cart yet.</p>
                <Link href="/marketplace">
                  <Button>Start Shopping</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-6">Order Summary</h3>
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-bold text-gray-900">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className="font-bold text-gray-900">${shipping.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span className="font-bold text-gray-900">${tax.toFixed(2)}</span>
                  </div>
                  <div className="pt-4 border-t border-gray-100 flex justify-between items-baseline">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <div className="text-right">
                      <p className="text-2xl font-black text-primary-600">${total.toFixed(2)}</p>
                      <p className="text-xs text-gray-400 font-medium">USD</p>
                    </div>
                  </div>
                </div>
                <Link href="/checkout">
                  <Button className="w-full py-4 text-lg font-bold group" size="lg" disabled={cartItems.length === 0}>
                    Proceed to Checkout
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <p className="mt-6 text-xs text-gray-400 text-center leading-relaxed">
                  By proceeding, you agree to MSquare’s Terms of Service and Privacy Policy.
                </p>
              </CardContent>
            </Card>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-green-600 flex-shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <p className="text-sm text-gray-600">
                Secure checkout with industry-leading encryption.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
