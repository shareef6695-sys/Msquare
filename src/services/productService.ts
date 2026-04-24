import { mockProducts } from "@/data/mockProducts";
import { Product } from "@/types";

export const getFeaturedProducts = (): Product[] => {
  return mockProducts.slice(0, 4);
};

export const getTopSellingProducts = (): Product[] => {
  return [...mockProducts].sort((a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0));
};

export const getNewProducts = (): Product[] => {
  return [...mockProducts].sort(
    (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
  );
};

export const getRecommendedProducts = (): Product[] => {
  return [...mockProducts].sort(() => 0.5 - Math.random());
};

