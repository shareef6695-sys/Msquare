"use client";

import type { CartItem, Product } from "@/types";
import { listProducts } from "@/services/productService";

type StoredCart = {
  merchantId?: string;
  items: Array<{ productId: string; quantity: number }>;
  updatedAt: string;
};

const CART_KEY = "msquare.cart.v1";

const isBrowser = () => typeof window !== "undefined";

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const loadStoredCart = (): StoredCart => {
  if (!isBrowser()) return { items: [], updatedAt: new Date().toISOString() };
  return safeJsonParse<StoredCart>(window.localStorage.getItem(CART_KEY), { items: [], updatedAt: new Date().toISOString() });
};

const saveStoredCart = (cart: StoredCart) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
};

export const clearCart = () => {
  const next: StoredCart = { items: [], updatedAt: new Date().toISOString() };
  saveStoredCart(next);
  return next;
};

export const getCart = (): StoredCart => loadStoredCart();

export const addToCart = (input: { productId: string; quantity: number; merchantId: string }) => {
  const cart = loadStoredCart();
  const replacingMerchant = Boolean(cart.merchantId && cart.merchantId !== input.merchantId);
  const base: StoredCart = replacingMerchant ? { items: [], updatedAt: new Date().toISOString() } : cart;
  const items = [...(base.items ?? [])];
  const idx = items.findIndex((i) => i.productId === input.productId);
  if (idx >= 0) items[idx] = { ...items[idx], quantity: items[idx].quantity + input.quantity };
  else items.unshift({ productId: input.productId, quantity: input.quantity });
  const next: StoredCart = { merchantId: input.merchantId, items, updatedAt: new Date().toISOString() };
  saveStoredCart(next);
  return { cart: next, replacingMerchant };
};

export const updateCartQuantity = (productId: string, quantity: number) => {
  const cart = loadStoredCart();
  const items = (cart.items ?? []).map((i) => (i.productId === productId ? { ...i, quantity } : i)).filter((i) => i.quantity > 0);
  const next: StoredCart = { ...cart, items, updatedAt: new Date().toISOString() };
  if (next.items.length === 0) delete next.merchantId;
  saveStoredCart(next);
  return next;
};

export const removeFromCart = (productId: string) => {
  const cart = loadStoredCart();
  const items = (cart.items ?? []).filter((i) => i.productId !== productId);
  const next: StoredCart = { ...cart, items, updatedAt: new Date().toISOString() };
  if (next.items.length === 0) delete next.merchantId;
  saveStoredCart(next);
  return next;
};

export const getResolvedCartItems = (): { merchantId?: string; items: CartItem[]; subtotal: number } => {
  const cart = loadStoredCart();
  const productsById = new Map(listProducts().map((p) => [p.id, p]));
  const items: CartItem[] = (cart.items ?? [])
    .map((i) => {
      const product = productsById.get(i.productId);
      if (!product) return null;
      return { productId: i.productId, quantity: i.quantity, product } satisfies CartItem;
    })
    .filter(Boolean) as CartItem[];
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const inferredMerchantId = cart.merchantId ?? items[0]?.product.merchantId;
  return { merchantId: inferredMerchantId, items, subtotal };
};

export const getCartItemCount = () => {
  const cart = loadStoredCart();
  return (cart.items ?? []).reduce((sum, i) => sum + (i.quantity ?? 0), 0);
};

export const getCartMerchant = (): Product["merchantId"] | undefined => {
  return loadStoredCart().merchantId;
};
