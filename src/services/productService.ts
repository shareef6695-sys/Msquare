import { mockProducts } from "@/data/mockProducts";
import type { Product } from "@/types";

const PRODUCTS_KEY = "msquare.products.v1";

const isBrowser = () => typeof window !== "undefined";

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const loadProducts = (): Product[] => {
  if (!isBrowser()) return mockProducts;
  const existing = safeJsonParse<Product[]>(window.localStorage.getItem(PRODUCTS_KEY), []);
  if (existing.length > 0) return existing;
  window.localStorage.setItem(PRODUCTS_KEY, JSON.stringify(mockProducts));
  return mockProducts;
};

const saveProducts = (products: Product[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
};

export const addProduct = (input: Omit<Product, "id"> & { id?: string }): Product => {
  const products = loadProducts();
  const id = input.id ?? `p_${Math.random().toString(16).slice(2, 10)}`;
  const next: Product = { ...input, id };
  saveProducts([next, ...products]);
  return next;
};

export const updateProduct = (id: string, patch: Partial<Product>): Product | null => {
  const products = loadProducts();
  const existing = products.find((p) => p.id === id);
  if (!existing) return null;
  const next = products.map((p) => (p.id === id ? { ...p, ...patch } : p));
  saveProducts(next);
  return next.find((p) => p.id === id) ?? null;
};

export const getFeaturedProducts = (): Product[] => {
  return loadProducts().filter((p) => Boolean(p.isFeatured)).slice(0, 4);
};

export const getTopSellingProducts = (): Product[] => {
  return [...loadProducts()].sort((a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0));
};

export const getNewProducts = (): Product[] => {
  return [...loadProducts()].sort(
    (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
  );
};

export const getRecommendedProducts = (): Product[] => {
  return [...loadProducts()].sort(() => 0.5 - Math.random());
};

export const listProducts = (): Product[] => loadProducts();
