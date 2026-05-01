"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RedirectHandler() {
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    const token = search.get("token");
    const provider = search.get("provider");
    if (token) {
      router.replace(`/auth/callback?token=${token}${provider ? `&provider=${provider}` : ""}`);
    } else {
      router.replace("/login");
    }
  }, [router, search]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="h-8 w-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
}

export default function AuthRedirectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <RedirectHandler />
    </Suspense>
  );
}
