import React from 'react';
import { 
  Zap, 
  ShieldCheck, 
  BarChart3, 
  Globe2, 
  Layers, 
  Smartphone 
} from 'lucide-react';

const features = [
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Lightning Fast",
    description: "Optimized for speed. Your store and products load instantly for a better conversion rate."
  },
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: "Secure Payments",
    description: "Enterprise-grade security for all transactions. Support for multi-currency and global methods."
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Advanced Analytics",
    description: "Deep insights into your sales, customer behavior, and inventory health in real-time."
  },
  {
    icon: <Globe2 className="w-6 h-6" />,
    title: "Global Scale",
    description: "Sell anywhere in the world with built-in localization and cross-border logistics support."
  },
  {
    icon: <Layers className="w-6 h-6" />,
    title: "Seamless Integration",
    description: "Connect with your existing ERP, CRM, and logistics providers via our robust API."
  },
  {
    icon: <Smartphone className="w-6 h-6" />,
    title: "Mobile First",
    description: "A fully responsive experience that looks stunning on every device, from mobile to desktop."
  }
];

export const Features = () => {
  return (
    <section id="features" className="section-padding bg-gray-50/50">
      <div className="container-max">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="mb-6">Everything You Need to <span className="text-primary-600">Scale</span></h2>
          <p className="text-gray-600 text-lg">
            MSquare provides a comprehensive suite of tools designed to help both B2B and B2C businesses thrive in the modern economy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="p-8 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group"
            >
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 mb-6 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
