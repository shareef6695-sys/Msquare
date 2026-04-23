import React from 'react';
import { Search, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const MarketplaceHero = () => {
  return (
    <div className="bg-primary-600 pt-32 pb-20 relative overflow-hidden">
      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      
      <div className="container-max relative z-10 text-center">
        <h1 className="text-white mb-8">Global Sourcing <span className="text-primary-200 text-shadow">Made Easy</span></h1>
        
        {/* Search Bar */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-2 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center gap-2">
            <div className="flex-1 w-full flex items-center px-4 border-b md:border-b-0 md:border-r border-gray-100">
              <Search className="w-5 h-5 text-gray-400 mr-3" />
              <input 
                type="text" 
                placeholder="Search products, suppliers, or categories" 
                className="w-full py-4 text-gray-700 focus:outline-none bg-transparent"
              />
            </div>
            <div className="w-full md:w-auto flex items-center px-4">
              <MapPin className="w-5 h-5 text-gray-400 mr-3" />
              <select className="bg-transparent py-4 text-gray-700 focus:outline-none cursor-pointer w-full md:w-32">
                <option>All Locations</option>
                <option>USA</option>
                <option>China</option>
                <option>Europe</option>
              </select>
            </div>
            <Button size="lg" className="w-full md:w-auto px-10">Search</Button>
          </div>
          
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-primary-100">
            <span>Popular:</span>
            {['Solar Panels', 'Industrial Pumps', 'Wholesale Cotton', 'Server Racks'].map(tag => (
              <a key={tag} href="#" className="hover:text-white underline decoration-primary-400/50">{tag}</a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
