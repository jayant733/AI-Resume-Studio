"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { APP_STATE_KEY, mergeState } from "@/lib/storage";
import { getMe } from "@/lib/api";
import { Loader2 } from "lucide-react";

function CallbackHandler() {
  const router = useRouter();
  const search = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      const token = search.get("token") || "";
      if (!token) {
        setError("Missing authentication token.");
        return;
      }

      try {
        mergeState(APP_STATE_KEY, { authToken: token });
        const user = await getMe(token);
        mergeState(APP_STATE_KEY, { currentUser: user });
        router.replace("/dashboard");
      } catch (e: any) {
        setError(e?.message || "Authentication failed.");
      }
    };
    run();
  }, [router, search]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <p className="text-sm font-black text-slate-900">Login failed</p>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <button
            className="mt-4 w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 transition"
            onClick={() => router.replace("/login")}
            type="button"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="flex items-center gap-3 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        <p className="text-sm font-medium">Finishing sign-in…</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <CallbackHandler />
    </Suspense>
  );
}

