"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { loadState } from "@/lib/storage";

const PUBLIC_ROUTES = new Set(["/", "/auth", "/pricing"]);

export function RouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const state = loadState();
    const isAuthed = Boolean(state.authToken && state.currentUser);

    if (PUBLIC_ROUTES.has(pathname)) {
      if (pathname === "/auth" && isAuthed) {
        router.replace("/upload");
        return;
      }
      setAllowed(true);
      return;
    }

    if (!isAuthed) {
      router.replace("/auth");
      return;
    }

    setAllowed(true);
  }, [pathname, router]);

  if (!allowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-[28px] border border-white/70 bg-white/80 p-8 shadow-soft">
        <p className="text-sm text-slate">Loading secure workspace...</p>
      </div>
    );
  }

  return <>{children}</>;
}
