import { Hero } from "@/features/landing/Hero";
import { Features } from "@/features/landing/Features";
import { Solutions } from "@/features/landing/Solutions";
import { TrustedLogos } from "@/features/landing/TrustedLogos";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Banknote, CheckCircle2, CreditCard, PackageCheck, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import { CUSTOMER_LOGIN_URL, GET_STARTED_URL, MERCHANT_LOGIN_URL } from "@/constants/links";

const trustHighlights = [
  "Escrow payment protection",
  "Shipment coverage",
  "LC supported",
  "Verified merchants",
];

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      <Hero />
      
      {/* Trust Badges */}
      <section className="py-12 border-y border-gray-100 bg-white">
        <div className="container-max">
          <p className="text-center text-sm font-semibold text-gray-500 uppercase tracking-widest mb-10">
            Trusted by industry leaders worldwide
          </p>
          <TrustedLogos />
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-max">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="mb-3">Trade Assurance & Payment Protection</h2>
            <p className="text-gray-600">
              Buy with confidence using MSquare escrow, shipment protection, and LC-enabled workflows. Funds stay protected until delivery is confirmed.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trustHighlights.map((item) => (
              <div
                key={item}
                className="flex items-start gap-4 rounded-2xl border border-gray-200/60 bg-gray-50/60 px-6 py-5"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="text-sm font-semibold text-gray-900">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-gray-50">
        <div className="container-max">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="mb-3">How It Works</h2>
            <p className="text-gray-600">
              A streamlined protection flow designed for enterprise procurement and verified suppliers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Place Order", desc: "Submit your order with escrow, LC, or bank transfer.", icon: <ShoppingCart className="w-5 h-5" /> },
              { title: "Payment Secured", desc: "Funds are protected in escrow or validated via bank LC.", icon: <ShieldCheck className="w-5 h-5" /> },
              { title: "Order Shipped", desc: "Supplier ships and shares documents & tracking.", icon: <Truck className="w-5 h-5" /> },
              { title: "Payment Released", desc: "Release happens after delivery confirmation.", icon: <Banknote className="w-5 h-5" /> },
            ].map((step, idx) => (
              <div key={step.title} className="rounded-3xl border border-gray-200/60 bg-white p-6 shadow-sm shadow-gray-900/5">
                <div className="flex items-start justify-between gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary-50 border border-primary-200/60 flex items-center justify-center text-primary-700">
                    {step.icon}
                  </div>
                  <div className="text-xs font-black text-gray-400">0{idx + 1}</div>
                </div>
                <div className="mt-5 text-lg font-black text-gray-900">{step.title}</div>
                <div className="mt-2 text-sm text-gray-600">{step.desc}</div>
                <div className="mt-4 h-px bg-gray-100" />
                <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-gray-500">
                  {idx === 0 ? <CreditCard className="w-4 h-4" /> : idx === 1 ? <ShieldCheck className="w-4 h-4" /> : idx === 2 ? <PackageCheck className="w-4 h-4" /> : <Banknote className="w-4 h-4" />}
                  Trade Assurance
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Features />
      <Solutions />

      {/* Pricing Teaser */}
      <section id="pricing" className="section-padding bg-gray-900 text-white">
        <div className="container-max text-center">
          <h2 className="text-white mb-6">Simple, Transparent <span className="text-primary-400">Pricing</span></h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-16 text-lg">
            No hidden fees. Choose a plan that fits your business size and scale as you grow.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { name: 'Starter', price: '0', features: ['50 Products', 'Standard Support', 'Basic Analytics'] },
              { name: 'Professional', price: '49', features: ['Unlimited Products', 'Priority Support', 'Advanced Analytics', 'Custom Branding'], popular: true },
              { name: 'Enterprise', price: 'Custom', features: ['Custom Solutions', 'Dedicated Manager', 'API Access', 'White-label Options'] }
            ].map((plan) => (
              <div key={plan.name} className={`p-8 rounded-2xl border ${plan.popular ? 'border-primary-500 bg-gray-800 ring-2 ring-primary-500' : 'border-gray-800 bg-gray-800/50'} text-left flex flex-col`}>
                <h3 className="text-xl mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  {plan.price !== 'Custom' && <span className="text-gray-400 text-sm ml-1">/mo</span>}
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                      <div className="w-1 h-1 bg-primary-400 rounded-full" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button variant={plan.popular ? 'primary' : 'outline'} className="w-full">
                  {plan.price === 'Custom' ? 'Contact Us' : 'Get Started'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section-padding bg-primary-600 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-primary-500/20 -skew-x-12 translate-x-1/2" />
        <div className="container-max relative z-10 text-center">
          <h2 className="text-white mb-8">Ready to transform your business?</h2>
          <p className="text-primary-100 text-xl mb-12 max-w-2xl mx-auto">
            Join over 10,000+ businesses already growing with MSquare.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={MERCHANT_LOGIN_URL} className="w-full sm:w-auto">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto px-8 py-4 text-primary-700 hover:bg-white">
                Merchant Login
              </Button>
            </Link>
            <Link href={CUSTOMER_LOGIN_URL} className="w-full sm:w-auto">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto px-8 py-4 text-primary-700 hover:bg-white">
                Customer Login
              </Button>
            </Link>
            <Link href={GET_STARTED_URL} className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto px-10 py-4 bg-gray-900 hover:bg-black text-white">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
