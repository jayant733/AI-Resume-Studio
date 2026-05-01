"use client";

import Link from "next/link";
import { 
  FileText, Sparkles, Target, UploadCloud, CreditCard, LogIn, Users, 
  LogOut, Lock, UserPlus, Briefcase, ChevronRight, Menu, X, Zap 
} from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { Chatbot } from "./chatbot";
import { APP_STATE_KEY, clearState, loadState } from "@/lib/storage";
import { User } from "@/lib/types";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

type NavItem = {
  href: string;
  label: string;
  icon: any;
  protected?: boolean;
  recruiterOnly?: boolean;
  tooltip: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navigation: NavGroup[] = [
  {
    label: "Resume Tools",
    items: [
      { href: "/upload", label: "Upload", icon: UploadCloud, protected: true, tooltip: "Upload and parse your resume" },
      { href: "/builder", label: "Builder", icon: FileText, protected: true, tooltip: "Edit your resume in real-time" },
      { href: "/job", label: "Job Match", icon: Target, protected: true, tooltip: "Analyze your fit for a job" },
    ]
  },
  {
    label: "Career Tools",
    items: [
      { href: "/suggestions", label: "Suggestions", icon: Sparkles, protected: true, tooltip: "AI-powered resume improvements" },
      { href: "/applications", label: "Applications", icon: Briefcase, protected: true, tooltip: "Track your job applications" },
      { href: "/tools", label: "Premium Tools", icon: Target, protected: true, tooltip: "Advanced optimization utilities" },
    ]
  },
  {
    label: "System",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Target, protected: true, tooltip: "Your activity and ATS trends" },
      { href: "/pricing", label: "Pricing", icon: CreditCard, tooltip: "View plans and billing" },
    ]
  }
];

const PUBLIC_ROUTES = new Set(["/", "/login", "/signup", "/pricing", "/auth/callback"]);

export function AppShell({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const pathname = usePathname();
  
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);

  useEffect(() => {
    const state = (loadState(APP_STATE_KEY) || {}) as any;
    setUser((state.currentUser as User) || null);
    setIsMobileMenuOpen(false); // Close menu on route change
    setHasMounted(true);
  }, [pathname]);

  function handleLogout() {
    clearState(APP_STATE_KEY);
    window.location.href = "/login";
  }

  const isAuthenticated = Boolean(user);
  const isPro = user?.subscription_tier === "pro" || user?.subscription_tier === "premium";

  // Prevent hydration flicker/mismatch
  if (!hasMounted) return <div className="min-h-screen bg-slate-50" />;

  if (isPublicRoute && !isAuthenticated) {
    return (
      <div className="mx-auto min-h-screen w-full bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 shadow-sm backdrop-blur-md sticky top-5 z-50">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xs">AI</div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none">Resume AI</p>
                <p className="text-sm font-bold text-slate-900">Studio</p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/login" className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition">Login</Link>
              <Link href="/signup" className="px-5 py-2 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition">Sign up</Link>
            </div>
          </header>
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile Toggle */}
      <div className="fixed top-4 right-4 z-50 xl:hidden">
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-3 bg-white border border-slate-200 rounded-2xl shadow-lg text-slate-600"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 transition-transform xl:translate-x-0 xl:static xl:inset-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-6">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-blue-200">AI</div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Resume AI</p>
              <p className="text-lg font-black text-slate-900">Studio</p>
            </div>
          </div>

          {/* User Profile */}
          {user && (
            <div className="mb-8 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-blue-600 font-bold">
                  {user.full_name?.[0] || user.email[0].toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-slate-900 truncate">{user.full_name || "User"}</p>
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      "text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider",
                      isPro ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-500"
                    )}>
                      {user.subscription_tier}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Usage</span>
                  <span>{user.credits ?? 0}/10 credits</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(((user.credits ?? 0) / 10) * 100, 100)}%` }} 
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Groups */}
          <nav className="flex-1 space-y-8 overflow-y-auto pr-2 custom-scrollbar">
            {navigation.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 pl-4">{group.label}</p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    if (item.recruiterOnly && user?.role !== "recruiter") return null;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.tooltip}
                        className={clsx(
                          "group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all relative",
                          isActive 
                            ? "bg-blue-50 text-blue-600" 
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        )}
                      >
                        <Icon size={18} className={clsx(
                          "transition-colors",
                          isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                        )} />
                        <span>{item.label}</span>
                        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-blue-600 rounded-r-full" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Upgrade CTA */}
          {!isPro && isAuthenticated && (
            <div className="mt-8 mb-4 p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-200 relative overflow-hidden group">
              <Zap className="absolute -right-2 -bottom-2 text-white/10 w-16 h-16 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-black uppercase tracking-widest mb-1 opacity-80">Go Unlimited</p>
              <p className="text-sm font-bold mb-3">Upgrade to Pro</p>
              <Link 
                href="/pricing"
                className="block w-full py-2 bg-white text-blue-600 text-center rounded-xl text-xs font-black hover:bg-slate-50 transition"
              >
                Upgrade Now
              </Link>
            </div>
          )}

          {/* Logout */}
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="mt-auto flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 min-h-screen overflow-x-hidden relative">
        {/* Backdrop for mobile */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 xl:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
        <Chatbot />
      </main>
    </div>
  );
}
