"use client";

import React, { useState } from 'react';
import Link from "next/link";
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { 
  CreditCard, 
  Smartphone, 
  Banknote, 
  Building2, 
  ShieldCheck,
  FileText,
  CheckCircle2,
  Lock,
  Truck
} from 'lucide-react';
import { createEscrowOrder } from "@/services/orderStore";
import { PaymentMethod } from "@/types";

const paymentMethods: Array<{
  id: PaymentMethod;
  label: string;
  icon: React.ReactNode;
  description: string;
  disabled?: boolean;
}> = [
  { id: 'CARD', label: 'Credit / Debit Card', icon: <CreditCard className="w-5 h-5" />, description: 'All major cards supported' },
  { id: 'APPLE_PAY', label: 'Apple Pay', icon: <Smartphone className="w-5 h-5" />, description: 'Fast and secure payment' },
  { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: <Building2 className="w-5 h-5" />, description: 'Direct transfer to our account' },
  { id: 'COD', label: 'Cash on Delivery', icon: <Banknote className="w-5 h-5" />, description: 'Pay when you receive' },
  { id: 'ESCROW', label: 'Escrow (MSquare)', icon: <ShieldCheck className="w-5 h-5" />, description: 'Funds held until delivery is confirmed' },
  { id: 'LC', label: 'Letter of Credit (LC)', icon: <FileText className="w-5 h-5" />, description: 'Enterprise buyers only (bank-issued LC)' },
];

export default function CheckoutPage() {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CARD');
  const [includeInsurance, setIncludeInsurance] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOrdered, setIsOrdered] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const itemsTotal = 2400;
  const shippingFee = 45;
  const insuranceFee = includeInsurance ? itemsTotal * 0.015 : 0;
  const orderTotal = itemsTotal + shippingFee + insuranceFee;

  const handlePlaceOrder = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const created = createEscrowOrder({
        items: [
          {
            id: "oi_checkout_1",
            productId: "p1",
            productName: "Industrial Drill Machine (Bench)",
            price: 1200,
            quantity: 2,
          },
        ],
        totalAmount: orderTotal,
        paymentMethod: selectedMethod,
        insuranceEnabled: includeInsurance,
      });
      setOrderId(created.id);
      setIsProcessing(false);
      setIsOrdered(true);
    }, 2000);
  };

  if (isOrdered) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4 pt-24">
        <div className="max-w-2xl w-full">
          <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-4">Order Confirmed!</h1>
          <p className="text-gray-500 mb-10 text-lg">
            Your order <span className="font-bold text-gray-900">#{orderId ?? "ORD-00000"}</span> has been placed successfully.
            We’ve sent a confirmation email to your registered address.
          </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary-50 border border-primary-200/60 flex items-center justify-center text-primary-700">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-lg font-black text-gray-900">MSquare Escrow</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Your payment is held securely until you confirm delivery. Then the funds are released to the merchant.
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    { title: "Payment goes to MSquare escrow", icon: <Banknote className="w-4 h-4" /> },
                    { title: "Merchant ships the product", icon: <Truck className="w-4 h-4" /> },
                    { title: "You confirm delivery", icon: <CheckCircle2 className="w-4 h-4" /> },
                    { title: "Money released to merchant", icon: <ShieldCheck className="w-4 h-4" /> },
                  ].map((step) => (
                    <div
                      key={step.title}
                      className="flex items-center gap-3 rounded-2xl border border-gray-200/60 bg-white px-4 py-3"
                    >
                      <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-600">
                        {step.icon}
                      </div>
                      <div className="text-sm font-semibold text-gray-900">{step.title}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-lg font-black text-gray-900 mb-2">Next steps</div>
                <div className="text-sm text-gray-500 mb-6">
                  Track the shipment and confirm delivery once the order arrives.
                </div>
                <div className="space-y-3">
                  <Link href="/customer/orders" className="block">
                    <Button className="w-full py-4 text-lg font-bold">Track My Order</Button>
                  </Link>
                  <Link href="/marketplace" className="block">
                    <Button variant="outline" className="w-full py-4 text-lg font-bold">Back to Marketplace</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pt-24 pb-20">
      <div className="container-max">
        <h1 className="text-3xl font-bold mb-10">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Shipping Address */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                <h2 className="text-xl font-bold">Shipping Address</h2>
              </div>
              <Card>
                <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input type="text" className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" defaultValue="Sarah Miller" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                    <input type="text" className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" defaultValue="123 Commerce St" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input type="text" className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" defaultValue="New York" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Zip Code</label>
                    <input type="text" className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" defaultValue="10001" />
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Payment Method */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                <h2 className="text-xl font-bold">Payment Method</h2>
              </div>
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div 
                    key={method.id}
                    onClick={() => !method.disabled && setSelectedMethod(method.id)}
                    className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      selectedMethod === method.id 
                        ? 'border-primary-600 bg-primary-50/30' 
                        : method.disabled ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50' : 'border-white bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${selectedMethod === method.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {method.icon}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{method.label}</p>
                        <p className="text-xs text-gray-500">{method.description}</p>
                      </div>
                    </div>
                    {method.disabled ? (
                      <span className="text-[10px] font-bold bg-gray-200 px-2 py-1 rounded uppercase tracking-wider">Coming Soon</span>
                    ) : (
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedMethod === method.id ? 'border-primary-600 bg-primary-600' : 'border-gray-200'
                      }`}>
                        {selectedMethod === method.id && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Order Summary Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-24">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-6">Order Summary</h3>
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-gray-600">
                    <span>Items Total</span>
                    <span className="font-bold text-gray-900">${itemsTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className="font-bold text-gray-900">${shippingFee.toFixed(2)}</span>
                  </div>
                  <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                    <label className="flex items-center justify-between gap-3 text-sm font-semibold text-gray-700">
                      <span> Add Shipment Insurance (+1.5%)</span>
                      <input
                        type="checkbox"
                        checked={includeInsurance}
                        onChange={(event) => setIncludeInsurance(event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </label>
                    <div className="mt-2 flex justify-between text-xs text-gray-500">
                      <span>Insurance fee</span>
                      <span className="font-semibold text-gray-700">${insuranceFee.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-100 flex justify-between items-baseline">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <div className="text-right">
                      <p className="text-2xl font-black text-primary-600">${orderTotal.toFixed(2)}</p>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">USD</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl mb-8 flex items-start gap-3">
                  <Lock className="w-4 h-4 text-gray-400 mt-1" />
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Payments are secure and encrypted. Your card information is never stored on our servers.
                  </p>
                </div>

                <Button 
                  className="w-full py-4 text-lg font-bold" 
                  size="lg"
                  disabled={isProcessing}
                  onClick={handlePlaceOrder}
                >
                  {isProcessing ? 'Processing...' : 'Place Order'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
