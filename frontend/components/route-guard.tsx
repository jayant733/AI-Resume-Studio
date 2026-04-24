"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { useAuthStore } from "@/lib/store/authStore";

const PUBLIC_ROUTES = new Set(["/", "/login", "/signup", "/pricing"]);

export function RouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    // Initial auth check on mount
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isLoading) return;

    if (PUBLIC_ROUTES.has(pathname)) {
      if ((pathname === "/login" || pathname === "/signup") && isAuthenticated) {
        router.replace("/upload");
        return;
      }
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
  }, [pathname, router, isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-[28px] border border-white/70 bg-white/80 p-8 shadow-soft">
        <div className="flex flex-col items-center gap-4">
           <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Verifying Session...</p>
        </div>
      </div>
    );
  }

  // Final check for non-public routes
  if (!isAuthenticated && !PUBLIC_ROUTES.has(pathname)) {
    return null;
  }

  return <>{children}</>;
}
