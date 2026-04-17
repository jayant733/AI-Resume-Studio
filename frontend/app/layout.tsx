import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { RouteGuard } from "@/components/route-guard";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Resume Optimization Platform",
  description: "Multimodal resume parsing, job matching, AI optimization, and PDF export."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppShell>
          <RouteGuard>{children}</RouteGuard>
        </AppShell>
      </body>
    </html>
  );
}
