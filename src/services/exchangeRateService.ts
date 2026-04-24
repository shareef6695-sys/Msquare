"use client";

import React, { useEffect, useState } from "react";
import type { CurrencyCode } from "@/types";
import { SUPPORTED_CURRENCIES, type ExchangeRatesUsd } from "@/utils/currencyConverter";

const STORAGE_KEY = "msquare.exchangeRates.usd.v1";
const ONE_HOUR_MS = 60 * 60 * 1000;

type CachedRates = {
  updatedAt: string;
  rates: ExchangeRatesUsd;
};

const seedRatesUsd: ExchangeRatesUsd = {
  USD: 1,
  SAR: 3.75,
  AED: 3.67,
  EUR: 0.92,
  GBP: 0.79,
  KWD: 0.31,
  BHD: 0.377,
  QAR: 3.64,
  OMR: 0.385,
};

const isBrowser = () => typeof window !== "undefined";

const parseCached = (raw: string | null): CachedRates | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedRates;
    if (!parsed?.updatedAt || typeof parsed.updatedAt !== "string") return null;
    if (!parsed?.rates || typeof parsed.rates !== "object") return null;
    const rates = parsed.rates as Partial<Record<CurrencyCode, unknown>>;
    for (const c of SUPPORTED_CURRENCIES) {
      const v = rates[c];
      if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return null;
    }
    return { updatedAt: parsed.updatedAt, rates: parsed.rates };
  } catch {
    return null;
  }
};

const loadCached = (): CachedRates | null => {
  if (!isBrowser()) return null;
  return parseCached(window.localStorage.getItem(STORAGE_KEY));
};

const saveCached = (input: CachedRates) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
};

const msSince = (iso: string) => {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return Date.now() - t;
};

const fetchLiveRatesUsd = async (): Promise<CachedRates> => {
  const apiKey =
    (process.env.NEXT_PUBLIC_EXCHANGE_RATE_API_KEY as string | undefined) ??
    (process.env.EXCHANGE_RATE_API_KEY as string | undefined) ??
    "replace-with-real-key";

  const res = await fetch(`https://v6.exchangerate-api.com/v6/${encodeURIComponent(apiKey)}/latest/USD`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Exchange rate API error (${res.status})`);
  }

  const json = (await res.json()) as any;
  const conversionRates = json?.conversion_rates as Record<string, unknown> | undefined;
  if (!conversionRates) {
    throw new Error("Exchange rate API response missing conversion_rates");
  }

  const rates = { ...seedRatesUsd } as ExchangeRatesUsd;
  for (const c of SUPPORTED_CURRENCIES) {
    const v = conversionRates[c];
    if (typeof v === "number" && Number.isFinite(v) && v > 0) rates[c] = v;
  }

  const updatedAt = new Date().toISOString();
  return { updatedAt, rates };
};

export type ExchangeRatesResult = {
  ratesUsd: ExchangeRatesUsd;
  updatedAt: string;
  source: "live" | "cache" | "seed";
  stale: boolean;
  usedFallback: boolean;
  message?: string;
};

export const getExchangeRatesUsd = async (): Promise<ExchangeRatesResult> => {
  const cached = loadCached();
  const cachedAge = cached ? msSince(cached.updatedAt) : Number.POSITIVE_INFINITY;

  if (cached && cachedAge <= ONE_HOUR_MS) {
    return { ratesUsd: cached.rates, updatedAt: cached.updatedAt, source: "cache", stale: false, usedFallback: false };
  }

  try {
    const live = await fetchLiveRatesUsd();
    saveCached(live);
    return { ratesUsd: live.rates, updatedAt: live.updatedAt, source: "live", stale: false, usedFallback: false };
  } catch {
    if (cached) {
      return {
        ratesUsd: cached.rates,
        updatedAt: cached.updatedAt,
        source: "cache",
        stale: true,
        usedFallback: true,
        message: "Using last available exchange rate",
      };
    }
    return {
      ratesUsd: seedRatesUsd,
      updatedAt: new Date().toISOString(),
      source: "seed",
      stale: true,
      usedFallback: true,
      message: "Using last available exchange rate",
    };
  }
};

export const useExchangeRatesUsd = () => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ExchangeRatesResult | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void getExchangeRatesUsd().then((r) => {
      if (!alive) return;
      setResult(r);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { loading, result };
};

