import React from "react";
import { ExecutiveLayout } from "@/layouts/ExecutiveLayout";

export default function CeoDashboardLayout({ children }: { children: React.ReactNode }) {
  return <ExecutiveLayout title="CEO Dashboard">{children}</ExecutiveLayout>;
}

