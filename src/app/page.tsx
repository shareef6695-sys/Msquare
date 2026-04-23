import { Hero } from "@/features/landing/Hero";
import { Features } from "@/features/landing/Features";
import { Solutions } from "@/features/landing/Solutions";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { GET_STARTED_URL } from "@/constants/links";

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
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {['TechCorp', 'GlobalFlow', 'IndustrialX', 'MarketPro', 'SupplyChain'].map((name) => (
              <span key={name} className="text-2xl font-black text-gray-900">{name}</span>
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
          <Link href={GET_STARTED_URL}>
            <Button size="lg" variant="secondary" className="px-12 py-4 text-primary-600 hover:bg-white">
              Get Started for Free
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
