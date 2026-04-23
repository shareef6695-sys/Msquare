import { MarketplaceHero } from "@/features/marketplace/MarketplaceHero";
import { CategoryScroll } from "@/features/marketplace/CategoryScroll";
import { ProductSection } from "@/features/marketplace/ProductSection";
import { MOCK_PRODUCTS } from "@/data/mockProducts";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { CUSTOMER_LOGIN_URL, MERCHANT_LOGIN_URL } from "@/constants/links";
import { MOCK_CATEGORIES } from "@/data/mockCategories";

export default function MarketplacePage() {
  const featuredProducts = MOCK_PRODUCTS.filter(p => p.isFeatured);
  const topSellingProducts = MOCK_PRODUCTS.filter(p => p.isTopSelling);
  const newArrivals = MOCK_PRODUCTS.filter(p => p.isNewArrival);
  const recommendedProducts = [...MOCK_PRODUCTS].sort((a, b) => b.rating - a.rating).slice(0, 4);
  const categorySpotlight = MOCK_CATEGORIES.slice(0, 3);

  return (
    <div className="bg-gray-50 min-h-screen">
      <MarketplaceHero />
      <CategoryScroll />
      
      <ProductSection 
        title="Featured Products" 
        subtitle="Handpicked quality items from top-tier suppliers"
        products={featuredProducts} 
        actionHref="/marketplace"
      />

      <section className="py-12 bg-gradient-to-r from-gray-950 to-primary-950 text-white">
        <div className="container-max flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="text-white mb-3">Are you a Supplier?</h2>
            <p className="text-primary-200 text-lg">
              Join thousands of merchants already selling on MSquare. 
              Get access to millions of buyers worldwide with our premium seller tools.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Link href={MERCHANT_LOGIN_URL} className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-white text-gray-950 hover:bg-gray-100 whitespace-nowrap">
                Merchant Login
              </Button>
            </Link>
            <Link href={CUSTOMER_LOGIN_URL} className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/30 text-white bg-white/10 hover:bg-white/15 hover:border-white/40 whitespace-nowrap">
                Customer Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <ProductSection 
        title="Top Selling" 
        subtitle="The most popular items in our marketplace right now"
        products={topSellingProducts} 
        actionHref="/marketplace"
      />

      <ProductSection 
        title="New Arrivals" 
        subtitle="Discover the latest products added to our catalog"
        products={newArrivals} 
        actionHref="/marketplace"
      />

      <ProductSection
        title="Recommended for You"
        subtitle="Top-rated items curated from trusted suppliers"
        products={recommendedProducts}
        actionHref="/marketplace"
      />

      <section className="py-16">
        <div className="container-max">
          <div className="mb-10 flex items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-gray-900 mb-2">Products by Category</h2>
              <p className="text-gray-500">Explore selected inventory across key industries.</p>
            </div>
            <Link href="/marketplace" className="text-sm font-semibold text-primary-700 hover:text-primary-800">
              Browse all
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {categorySpotlight.map((cat) => {
              const products = MOCK_PRODUCTS.filter((p) => p.categoryId === cat.id).slice(0, 4);
              return (
                <div key={cat.id} className="rounded-3xl border border-gray-200/60 bg-white p-6 shadow-sm shadow-gray-900/5">
                  <div className="flex items-center justify-between mb-5">
                    <div className="text-lg font-black text-gray-900">{cat.name}</div>
                    <Link href={`/marketplace?category=${cat.slug}`} className="text-sm font-semibold text-primary-700 hover:text-primary-800">
                      View
                    </Link>
                  </div>
                  <div className="space-y-4">
                    {products.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
                        No items available yet.
                      </div>
                    ) : (
                      products.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{p.name}</div>
                            <div className="text-xs text-gray-500 mt-1">MOQ {p.minOrderQuantity} • {p.location}</div>
                          </div>
                          <div className="text-sm font-black text-gray-900">${p.price.toFixed(2)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Supplier Highlight Section */}
      <section className="py-20">
        <div className="container-max">
          <div className="mb-12 flex items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-gray-900 mb-2">Top Rated Suppliers</h2>
              <p className="text-gray-500">Verified partners with consistent fulfillment and high ratings.</p>
            </div>
            <Link href={MERCHANT_LOGIN_URL} className="hidden sm:block">
              <Button variant="outline" size="sm">Become a Supplier</Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { name: 'TechCorp Industrial', location: 'Germany', products: 1240, rating: 4.9 },
              { name: 'Global Machinery', location: 'UAE', products: 850, rating: 4.8 },
              { name: 'Fashion Hub', location: 'Turkey', products: 3200, rating: 4.7 }
            ].map((supplier) => (
              <div key={supplier.name} className="bg-white p-7 rounded-3xl border border-gray-200/60 shadow-sm shadow-gray-900/5 hover:shadow-md transition-all duration-300">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl border border-gray-200/60" />
                    <div>
                      <h3 className="text-lg font-black text-gray-900">{supplier.name}</h3>
                      <p className="text-gray-500 text-sm mt-1">{supplier.location} • {supplier.products} products</p>
                    </div>
                  </div>
                  <div className="rounded-full bg-green-50 text-green-700 border border-green-200/60 px-3 py-1 text-xs font-bold">
                    Verified
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-yellow-500 text-sm font-black">
                    <span>★</span> {supplier.rating}
                    <span className="text-gray-400 font-semibold">/ 5</span>
                  </div>
                  <Button variant="outline" size="sm">View Supplier</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
