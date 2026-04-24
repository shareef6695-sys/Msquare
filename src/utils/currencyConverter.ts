"use client";

import type { CurrencyCode } from "@/types";

export const SUPPORTED_CURRENCIES: CurrencyCode[] = ["SAR", "AED", "USD", "EUR", "GBP", "KWD", "BHD", "QAR", "OMR"];

export type ExchangeRatesUsd = Record<CurrencyCode, number>;

export const getCurrencySymbol = (currency: CurrencyCode) => {
  const map: Record<CurrencyCode, string> = {
    SAR: "﷼",
    AED: "د.إ",
    USD: "$",
    EUR: "€",
    GBP: "£",
    KWD: "د.ك",
    BHD: ".د.ب",
    QAR: "ر.ق",
    OMR: "ر.ع.",
  };
  return map[currency];
};

export const formatCurrency = (amount: number, currency: CurrencyCode) => {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
};

export const convertCurrency = (amount: number, fromCurrency: CurrencyCode, toCurrency: CurrencyCode, ratesUsd: ExchangeRatesUsd) => {
  if (fromCurrency === toCurrency) {
    return { convertedAmount: amount, exchangeRate: 1 };
  }
  const fromRate = ratesUsd[fromCurrency];
  const toRate = ratesUsd[toCurrency];
  if (!fromRate || !toRate) {
    return { convertedAmount: amount, exchangeRate: 1 };
  }
  const amountUsd = amount / fromRate;
  const convertedAmount = amountUsd * toRate;
  const exchangeRate = toRate / fromRate;
  return { convertedAmount, exchangeRate };
};

