import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle2, Store, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CONTACT_SALES_URL, CUSTOMER_LOGIN_URL, GET_STARTED_URL, MERCHANT_LOGIN_URL } from '@/constants/links';

export const Hero = () => {
  return (
    <section className="relative pt-28 pb-16 md:pt-40 md:pb-24 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-100/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-blue-100/40 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-sm font-semibold mb-7">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-600" />
              </span>
              Next‑Gen B2B/B2C Marketplace
            </div>

            <h1 className="mb-6 text-balance bg-clip-text text-transparent bg-gradient-to-b from-gray-900 via-gray-900 to-gray-600">
              A premium marketplace that scales with your business.
            </h1>

            <p className="max-w-2xl mx-auto lg:mx-0 text-base md:text-lg text-gray-600 mb-8">
              Source globally, sell confidently, and manage operations with a modern dashboard built for serious commerce.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link href={GET_STARTED_URL} className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto gap-2 group">
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href={CONTACT_SALES_URL} className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Contact Sales
                </Button>
              </Link>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <Link href={MERCHANT_LOGIN_URL} className="w-full sm:w-auto">
                <Button variant="outline" size="md" className="w-full sm:w-auto gap-2">
                  <Store className="w-4 h-4" />
                  Merchant Login
                </Button>
              </Link>
              <Link href={CUSTOMER_LOGIN_URL} className="w-full sm:w-auto">
                <Button variant="outline" size="md" className="w-full sm:w-auto gap-2">
                  <UserRound className="w-4 h-4" />
                  Customer Login
                </Button>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="relative">
              <div className="rounded-3xl border border-gray-200/60 bg-white/60 backdrop-blur-sm p-2 shadow-2xl shadow-gray-900/10">
                <div className="relative rounded-2xl border border-gray-100 bg-white overflow-hidden">
                  <div className="relative aspect-[16/10]">
                    <Image
                      src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1400&q=80"
                      alt="MSquare Dashboard"
                      fill
                      className="object-cover"
                      priority
                      sizes="(max-width: 1024px) 100vw, 900px"
                    />
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-6 -left-6 hidden md:block">
                <div className="bg-white rounded-2xl shadow-lg shadow-gray-900/10 border border-gray-200/60 p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-700">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold">Daily Active Merchants</p>
                    <p className="text-xl font-black text-gray-900">12,400+</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
