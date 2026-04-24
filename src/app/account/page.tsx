"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AccountPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/customer/dashboard");
  }, [router]);
  return null;
}
