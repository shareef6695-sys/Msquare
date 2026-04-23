import React from 'react';
import { ShoppingBag, Store, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { MERCHANT_LOGIN_URL, CUSTOMER_LOGIN_URL } from '@/constants/links';

export const Solutions = () => {
  return (
    <section id="solutions" className="section-padding overflow-hidden">
      <div className="container-max">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="mb-6">Solutions for <span className="text-primary-600">Every Role</span></h2>
          <p className="text-gray-600 text-lg">
            Whether you are a global manufacturer or an individual shopper, MSquare has a tailored experience for you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* For Merchants */}
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary-100 to-blue-50 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm h-full flex flex-col">
              <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-600 mb-8">
                <Store className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-bold mb-6 text-gray-900">For Merchants</h3>
              <p className="text-gray-600 text-lg mb-8 flex-1">
                Powerful dashboard to manage your products, orders, and customers. Set your own pricing, manage inventory, and reach thousands of buyers instantly.
              </p>
              <ul className="space-y-4 mb-10">
                {['Bulk Product Uploads', 'Real-time Order Tracking', 'Custom Storefront Branding', 'B2B/B2C Pricing Models'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-700">
                    <div className="w-1.5 h-1.5 bg-primary-600 rounded-full" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href={MERCHANT_LOGIN_URL}>
                <Button className="w-full lg:w-auto" size="lg">Merchant Portal <ArrowRight className="ml-2 w-5 h-5" /></Button>
              </Link>
            </div>
          </div>

          {/* For Customers */}
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-primary-50 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm h-full flex flex-col">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-8">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-bold mb-6 text-gray-900">For Customers</h3>
              <p className="text-gray-600 text-lg mb-8 flex-1">
                Browse millions of products from verified suppliers. Enjoy a seamless checkout experience with multiple payment options and reliable shipping.
              </p>
              <ul className="space-y-4 mb-10">
                {['Verified Supplier Badges', 'Secure Checkout Escrow', 'Personalized Recommendations', 'Multi-device Shopping'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-700">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href={CUSTOMER_LOGIN_URL}>
                <Button variant="secondary" className="w-full lg:w-auto" size="lg">Customer Portal <ArrowRight className="ml-2 w-5 h-5" /></Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
