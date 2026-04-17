"use client";

import Link from "next/link";
import { FileText, Sparkles, Target, UploadCloud, CreditCard, LogIn, Users, LogOut } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { Chatbot } from "./chatbot";
import { clearState, loadState } from "@/lib/storage";
import { User } from "@/lib/types";

const navItems = [
  { href: "/upload", label: "Upload", icon: UploadCloud },
  { href: "/job", label: "Job Match", icon: Target },
  { href: "/suggestions", label: "Suggestions", icon: Sparkles },
  { href: "/preview", label: "Preview", icon: FileText },
  { href: "/dashboard", label: "Recruiter", icon: Users },
  { href: "/tools", label: "Premium Tools", icon: Target },
  { href: "/pricing", label: "Pricing", icon: CreditCard },
  { href: "/auth", label: "Login", icon: LogIn }
];

export function AppShell({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const state = loadState();
    setCurrentUser(state.currentUser || null);
  }, []);

  function handleLogout() {
    clearState();
    window.location.href = "/auth";
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
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/85 transition hover:border-white/30 hover:bg-white/5"
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
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
