"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { APP_STATE_KEY, loadState } from "@/lib/storage";

const PUBLIC_ROUTES = new Set(["/", "/login", "/signup", "/pricing", "/auth", "/auth/callback"]);

export function RouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    const state = (loadState(APP_STATE_KEY) || {}) as any;
    const isAuthed = Boolean(state.authToken && state.currentUser);
    const role = state.currentUser?.role as string | undefined;

    if (PUBLIC_ROUTES.has(pathname)) {
      if ((pathname === "/login" || pathname === "/signup" || pathname === "/auth") && isAuthed) {
        router.replace("/upload");
        return;
      }
      setAllowed(true);
      return;
    }

    if (!isAuthed) {
      router.replace("/login");
      return;
    }

    if (pathname.startsWith("/recruiter") && role !== "recruiter") {
      router.replace("/dashboard");
      return;
    }

    setAllowed(true);
  }, [pathname, router]);

  if (!hasMounted) return null;

  if (!allowed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-[3rem] border border-white/50 bg-white/20 backdrop-blur-xl p-12 shadow-2xl">
        <div className="flex flex-col items-center gap-4">
           <div className="h-12 w-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
           <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Securing workspace...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
