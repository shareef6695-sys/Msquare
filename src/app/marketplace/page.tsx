import { MarketplaceHero } from "@/features/marketplace/MarketplaceHero";
import { CategoryScroll } from "@/features/marketplace/CategoryScroll";
import { ProductSection } from "@/features/marketplace/ProductSection";
import { MOCK_PRODUCTS } from "@/data/mockProducts";
import { Button } from "@/components/ui/Button";

export default function MarketplacePage() {
  const featuredProducts = MOCK_PRODUCTS.filter(p => p.isFeatured);
  const topSellingProducts = MOCK_PRODUCTS.filter(p => p.isTopSelling);
  const newArrivals = MOCK_PRODUCTS.filter(p => p.isNewArrival);

  return (
    <div className="bg-gray-50 min-h-screen">
      <MarketplaceHero />
      <CategoryScroll />
      
      <ProductSection 
        title="Featured Products" 
        subtitle="Handpicked quality items from top-tier suppliers"
        products={featuredProducts} 
      />

      <section className="py-12 bg-primary-950 text-white">
        <div className="container-max flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="text-white mb-4">Are you a Supplier?</h2>
            <p className="text-primary-200 text-lg">
              Join thousands of merchants already selling on MSquare. 
              Get access to millions of buyers worldwide with our premium seller tools.
            </p>
          </div>
          <Button size="lg" className="bg-white text-primary-950 hover:bg-primary-100 whitespace-nowrap">
            Open Your Store
          </Button>
        </div>
      </section>

      <ProductSection 
        title="Top Selling" 
        subtitle="The most popular items in our marketplace right now"
        products={topSellingProducts} 
      />

      <ProductSection 
        title="New Arrivals" 
        subtitle="Discover the latest products added to our catalog"
        products={newArrivals} 
      />

      {/* Supplier Highlight Section */}
      <section className="py-20">
        <div className="container-max">
          <h2 className="mb-12">Top Rated Suppliers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { name: 'TechCorp Industrial', location: 'Germany', products: 1240, rating: 4.9 },
              { name: 'Global Machinery', location: 'UAE', products: 850, rating: 4.8 },
              { name: 'Fashion Hub', location: 'Turkey', products: 3200, rating: 4.7 }
            ].map((supplier) => (
              <div key={supplier.name} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-6">
                <div className="w-16 h-16 bg-gray-100 rounded-xl flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-bold mb-1">{supplier.name}</h3>
                  <p className="text-gray-500 text-sm mb-2">{supplier.location} • {supplier.products} Products</p>
                  <div className="flex items-center gap-1 text-yellow-500 text-sm font-bold">
                    <span>★</span> {supplier.rating}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
