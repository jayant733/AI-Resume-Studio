import Link from "next/link";
import { FileText, Sparkles, Target, UploadCloud, CreditCard, LogIn, Users } from "lucide-react";
import { ReactNode } from "react";
import { Chatbot } from "./chatbot";

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
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-6 px-4 py-6 lg:px-8">
      <aside className="hidden w-72 rounded-[32px] bg-ink p-6 text-white shadow-soft lg:block">
        <div className="mb-10">
          <p className="text-sm uppercase tracking-[0.3em] text-white/60">Resume AI</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight">Multimodal Resume Studio</h1>
          <p className="mt-3 text-sm text-white/70">
            Parse resumes, match jobs, optimize content, and export an ATS-ready PDF.
          </p>
        </div>
        <nav className="space-y-2">
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
      </aside>
      <main className="flex-1 overflow-x-hidden">{children}</main>
      <Chatbot />
    </div>
  );
}
