"use client";

import Link from "next/link";
import { FileText, Sparkles, Target, UploadCloud, CreditCard, LogIn, Users, LogOut, Lock, UserPlus } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { Chatbot } from "./chatbot";
import { clearState, loadState } from "@/lib/storage";
import { User } from "@/lib/types";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/upload", label: "Upload", icon: UploadCloud, protected: true },
  { href: "/job", label: "Job Match", icon: Target, protected: true },
  { href: "/suggestions", label: "Suggestions", icon: Sparkles, protected: true },
  { href: "/preview", label: "Preview", icon: FileText, protected: true },
  { href: "/dashboard", label: "Recruiter", icon: Users, protected: true },
  { href: "/tools", label: "Premium Tools", icon: Target, protected: true },
  { href: "/pricing", label: "Pricing", icon: CreditCard },
  { href: "/auth", label: "Login", icon: LogIn }
];

const PUBLIC_ROUTES = new Set(["/", "/auth", "/pricing"]);

export function AppShell({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);

  useEffect(() => {
    const state = loadState();
    setCurrentUser(state.currentUser || null);
  }, [pathname]);

  function handleLogout() {
    clearState();
    window.location.href = "/auth";
  }

  if (isPublicRoute && !currentUser) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 shadow-soft">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate">Resume AI</p>
            <p className="text-sm font-semibold text-ink">Multimodal Resume Studio</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-ink transition hover:bg-slate-100"
            >
              <LogIn className="h-4 w-4" />
              Login
            </Link>
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink/90"
            >
              <UserPlus className="h-4 w-4" />
              Sign up
            </Link>
          </div>
        </header>
        <main className="min-w-0">{children}</main>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-3 py-4 sm:px-4 lg:px-6 xl:flex-row xl:gap-6 xl:px-8">
      <aside className="w-full rounded-[28px] bg-ink p-4 text-white shadow-soft sm:p-6 xl:w-72 xl:rounded-[32px]">
        <div className="mb-6 sm:mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-white/60">Resume AI</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl xl:text-3xl">Multimodal Resume Studio</h1>
          <p className="mt-3 max-w-xl text-sm text-white/70">
            Parse resumes, match jobs, optimize content, and export an ATS-ready PDF.
          </p>
        </div>
        {currentUser ? (
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-sm font-medium text-white">{currentUser.full_name || currentUser.email}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/60">{currentUser.subscription_tier}</p>
          </div>
        ) : null}
        <nav className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isLocked = Boolean(item.protected && !currentUser);
            const href = isLocked ? "/auth" : item.href;
            const label = item.href === "/auth" && currentUser ? "Account" : item.label;
            return (
              <Link
                key={item.href}
                href={href}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                  isLocked
                    ? "border-white/5 bg-white/[0.03] text-white/55 hover:border-white/10 hover:bg-white/[0.06]"
                    : "border-white/10 text-white/85 hover:border-white/30 hover:bg-white/5"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                {isLocked ? <Lock className="ml-auto h-4 w-4 text-white/45" /> : null}
              </Link>
            );
          })}
        </nav>
        {!currentUser ? (
          <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-100/10 px-4 py-3 text-sm text-white/75">
            Login or sign up to unlock upload, job match, recruiter tools, and premium workflows.
          </div>
        ) : null}
        {currentUser ? (
          <button
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/85 transition hover:border-white/30 hover:bg-white/5"
            onClick={handleLogout}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        ) : null}
      </aside>
      <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      <Chatbot />
    </div>
  );
}
