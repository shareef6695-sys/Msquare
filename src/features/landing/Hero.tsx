import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GET_STARTED_URL, CONTACT_SALES_URL } from '@/constants/links';

export const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-100/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-blue-100/40 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-sm font-medium mb-8 animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-600"></span>
          </span>
          Next-Gen B2B/B2C Marketplace
        </div>

        <h1 className="mb-8 bg-clip-text text-transparent bg-gradient-to-b from-gray-900 via-gray-900 to-gray-600">
          Scale Your Business with <br className="hidden md:block" />
          <span className="text-primary-600">MSquare Commerce</span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-600 mb-12">
          The all-in-one platform for merchants to sell globally and customers to find quality products. 
          Built for scale, designed for simplicity.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link href={GET_STARTED_URL}>
            <Button size="lg" className="gap-2 group">
              Start Selling Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href={CONTACT_SALES_URL}>
            <Button variant="secondary" size="lg">Contact Sales</Button>
          </Link>
        </div>

        {/* Dashboard Preview */}
        <div className="relative max-w-5xl mx-auto">
          <div className="rounded-2xl border border-gray-200 bg-white/50 backdrop-blur-sm p-2 shadow-2xl">
            <div className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm">
              <img 
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80" 
                alt="MSquare Dashboard" 
                className="w-full h-auto"
              />
            </div>
          </div>
          
          {/* Stats Badges */}
          <div className="absolute -bottom-6 -left-6 hidden md:block">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Daily Active Merchants</p>
                <p className="text-xl font-bold text-gray-900">12,400+</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
