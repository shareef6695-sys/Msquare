"use client";

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const normalize = (status: string) => status.trim().toUpperCase().replaceAll(" ", "_");

const toneFor = (status: string) => {
  const s = normalize(status);
  if (["APPROVED", "DELIVERED", "COMPLETED", "RELEASED", "PAID", "SETTLED"].includes(s)) return "success";
  if (["PENDING", "PROCESSING", "UNDER_REVIEW", "BANK_REVIEW", "SUBMITTED"].includes(s)) return "warning";
  if (["SHIPPED", "IN_TRANSIT", "DISPATCHED"].includes(s)) return "info";
  if (["CANCELLED", "FAILED", "REJECTED", "REFUNDED"].includes(s)) return "danger";
  return "neutral";
};

const tones: Record<string, string> = {
  neutral: "border-gray-200/70 bg-gray-50 text-gray-700",
  info: "border-blue-200/70 bg-blue-50 text-blue-800",
  warning: "border-amber-200/70 bg-amber-50 text-amber-800",
  success: "border-emerald-200/70 bg-emerald-50 text-emerald-800",
  danger: "border-red-200/70 bg-red-50 text-red-700",
};

export const StatusPill = ({
  status,
  className,
}: {
  status: string;
  className?: string;
}) => {
  const tone = toneFor(status);
  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-black", tones[tone], className)}>
      {status.replaceAll("_", " ")}
    </span>
  );
};

