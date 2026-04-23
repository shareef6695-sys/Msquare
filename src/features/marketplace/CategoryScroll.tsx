import React from 'react';
import { MOCK_CATEGORIES } from '@/data/mockCategories';

export const CategoryScroll = () => {
  return (
    <section className="py-12 bg-white">
      <div className="container-max">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Popular Categories</h2>
          <a href="#" className="text-primary-600 font-semibold hover:underline text-sm">View All</a>
        </div>
        
        <div className="flex overflow-x-auto gap-6 pb-4 no-scrollbar">
          {MOCK_CATEGORIES.map((category) => (
            <div 
              key={category.id} 
              className="flex-shrink-0 group cursor-pointer text-center"
            >
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden mb-4 border-2 border-transparent group-hover:border-primary-500 transition-all shadow-sm">
                <img 
                  src={category.image} 
                  alt={category.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <span className="text-sm font-bold text-gray-700 group-hover:text-primary-600 transition-colors">
                {category.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
