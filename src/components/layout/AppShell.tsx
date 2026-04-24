"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const isPortalRoute = (pathname: string) => {
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/merchant/")) return true;
  if (pathname.startsWith("/customer/")) return true;
  if (pathname.startsWith("/account")) return true;
  return false;
};

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const hideMarketingChrome = isPortalRoute(pathname);

  if (hideMarketingChrome) return <>{children}</>;

  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
};

