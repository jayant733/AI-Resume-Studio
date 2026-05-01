"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Loader2, 
  Zap, 
  ShieldCheck, 
  CheckCircle2, 
  Info,
  X,
  AlertTriangle,
  Download
} from "lucide-react";
import { APP_STATE_KEY, loadState, saveState } from "@/lib/storage";
import { createCheckoutSession } from "@/lib/api";
import { clsx } from "clsx";

// --- TOAST COMPONENT ---
function Toast({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'warning', onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bg = type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-red-500' : 'bg-amber-500';

  return (
    <div className={clsx(
      "fixed top-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl text-white shadow-2xl animate-in slide-in-from-right duration-300",
      bg
    )}>
      {type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
      <p className="text-sm font-black tracking-tight">{message}</p>
      <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors"><X size={16} /></button>
    </div>
  );
}

const COMPARISON_FEATURES = [
  { name: "Resume Uploads", free: "3 / month", pro: "Unlimited", premium: "Unlimited" },
  { name: "AI Credits", free: "3 / month", pro: "100 / month", premium: "Unlimited" },
  { name: "ATS Scoring", free: "✓", pro: "✓", premium: "✓" },
  { name: "Premium Templates", free: "—", pro: "✓", premium: "✓" },
  { name: "Interview Tools", free: "—", pro: "✓", premium: "✓" },
  { name: "LinkedIn Optimizer", free: "—", pro: "—", premium: "✓" },
  { name: "Priority Support", free: "—", pro: "—", premium: "✓" },
];

const PRICING_PLANS = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    interval: "forever",
    description: "Perfect for exploring the platform.",
    features: ["3 AI Optimizations", "Basic ATS Scoring", "PDF Export"],
    buttonText: "Get Started",
    popular: false
  },
  {
    id: "pro",
    name: "Professional",
    price: "₹499",
    interval: "month",
    description: "Best for active job seekers.",
    features: ["100 AI Credits", "Premium Templates", "Interview Tools", "Job Tracking"],
    buttonText: "Upgrade to Pro",
    popular: true
  },
  {
    id: "premium",
    name: "Elite",
    price: "₹5000",
    interval: "year",
    description: "For maximum career impact.",
    features: ["Unlimited AI", "LinkedIn Profile AI", "Priority Processing", "Expert Support"],
    buttonText: "Go Unlimited",
    popular: false
  }
];

function PricingContent() {
  const searchParams = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null);
  const [error, setError] = useState("");

  const { token, currentUser } = useMemo(() => {
    const state = (loadState(APP_STATE_KEY) || {}) as any;
    return {
      token: (state.authToken as string) || "",
      currentUser: (state.currentUser as any) || null
    };
  }, []);

  const [currentTier, setCurrentTier] = useState(currentUser?.subscription_tier || "free");

  useEffect(() => {
    // 1. Reset loading state (handles back button)
    setCheckoutLoading(null);
    
    // 2. Handle Status from Query Params
    const status = searchParams.get("status");
    if (status === "success") {
      setToast({ message: "Payment successful, you are now on Pro plan!", type: "success" });
      setCurrentTier("pro"); // Optimistic update
      // Update local storage to persist the change immediately
      const state = (loadState(APP_STATE_KEY) || {}) as any;
      if (state.currentUser) {
        state.currentUser.subscription_tier = "pro";
        saveState(APP_STATE_KEY, state);
      }
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (status === "cancel") {
      setToast({ message: "Transaction not completed", type: "warning" });
      window.history.replaceState({}, '', window.location.pathname);
    }

    // 3. PageShow listener for robust back-button handling
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setCheckoutLoading(null);
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [searchParams]);

  async function startCheckout(planId: string) {
    if (planId === currentTier || planId === "free") return;
    
    const priceMap: Record<string, string> = {
      pro: "price_1TP6n6C6cduZKwHCC50HXpML",
      premium: "price_1TPGOLC6cduZKwHCqDKiDrlv"
    };

    const priceId = priceMap[planId];
    if (!priceId) return;

    setCheckoutLoading(planId);
    setError("");
    try {
      if (!token) throw new Error("Please log in before upgrading.");
      const { url } = await createCheckoutSession({ price_id: priceId, target_tier: planId }, token);
      if (url) window.location.href = url;
    } catch (e: any) {
      setError(e?.message || "Checkout failed.");
      setCheckoutLoading(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-6 space-y-20">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Header */}
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[10px] font-black uppercase tracking-widest text-blue-600">
          <Zap size={12} /> Pricing Plans
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
          Invest in your <span className="text-blue-600">career</span>.
        </h1>
        <p className="max-w-xl text-slate-500 font-medium">
          Whether you&apos;re just starting out or a seasoned professional, we have a plan that fits your job search needs.
        </p>
      </div>

      {error && (
        <div className="max-w-2xl mx-auto bg-red-50 border border-red-100 text-red-700 px-6 py-4 rounded-3xl text-sm font-medium flex items-center gap-3">
          <Info size={18} /> {error}
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {PRICING_PLANS.map((plan) => {
          const isCurrent = plan.id === currentTier;
          const isPopular = plan.popular;
          const isBusy = checkoutLoading === plan.id;

          return (
            <div 
              key={plan.id} 
              className={clsx(
                "relative flex flex-col p-8 rounded-[2.5rem] border-2 transition-all duration-300",
                isPopular 
                  ? "bg-slate-900 text-white border-slate-900 shadow-2xl scale-105 z-10" 
                  : "bg-white text-slate-900 border-slate-100 hover:border-slate-200"
              )}
            >
              {isPopular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full bg-blue-600 text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap">
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-black mb-2">{plan.name}</h3>
                <p className={clsx("text-sm font-medium", isPopular ? "text-slate-400" : "text-slate-500")}>
                  {plan.description}
                </p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tight">
                    {plan.price}
                  </span>
                  <span className={clsx("text-sm font-bold", isPopular ? "text-slate-400" : "text-slate-500")}>
                    /{plan.interval}
                  </span>
                </div>
              </div>

              <button
                onClick={() => startCheckout(plan.id)}
                disabled={isCurrent || isBusy || (plan.id === 'free' && currentTier !== 'free')}
                className={clsx(
                  "w-full py-4 rounded-2xl text-sm font-black transition shadow-lg flex items-center justify-center gap-2 mb-8",
                  (isCurrent || (plan.id === 'free' && currentTier !== 'free'))
                    ? "bg-slate-100 text-slate-400 cursor-default shadow-none" 
                    : isPopular
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-900/50"
                      : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200"
                )}
              >
                {isBusy ? <Loader2 className="animate-spin" size={16} /> : null}
                {isCurrent ? "Current Plan" : plan.id === 'free' ? "Always Free" : plan.buttonText}
              </button>

              <div className="space-y-4 flex-1">
                <p className={clsx("text-[10px] font-black uppercase tracking-widest", isPopular ? "text-white/40" : "text-slate-400")}>
                  What&apos;s included
                </p>
                <ul className="space-y-4">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-3 text-sm font-medium">
                      <CheckCircle2 size={18} className={isPopular ? "text-blue-400" : "text-blue-600"} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison */}
      <div className="space-y-12">
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Compare features</h2>
          <p className="text-slate-500 text-sm font-medium">Detailed breakdown of our subscription tiers.</p>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Feature</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Free</th>
                <th className="px-8 py-5 text-[10px] font-black text-blue-600 uppercase tracking-widest">Professional</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Elite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {COMPARISON_FEATURES.map((feature, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6 text-sm font-bold text-slate-700">{feature.name}</td>
                  <td className="px-8 py-6 text-sm font-medium text-slate-500">{feature.free}</td>
                  <td className="px-8 py-6 text-sm font-bold text-slate-900">{feature.pro}</td>
                  <td className="px-8 py-6 text-sm font-medium text-slate-500">{feature.premium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trust Banner */}
      <div className="flex flex-col md:flex-row items-center justify-between p-10 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm gap-8">
        <div className="space-y-2">
          <h3 className="text-xl font-black text-slate-900">Secure Payment</h3>
          <p className="text-sm text-slate-500 font-medium">We use Stripe for 128-bit encrypted payment processing.</p>
        </div>
        <div className="flex items-center gap-4">
          <ShieldCheck className="text-emerald-500" size={40} />
          <div className="h-10 w-px bg-slate-100" />
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 w-10 rounded-full border-2 border-white bg-slate-200" />
            ))}
            <div className="h-10 w-10 rounded-full border-2 border-white bg-blue-600 flex items-center justify-center text-[10px] font-black text-white">+2k</div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trusted by seekers</p>
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<PricingSkeleton />}>
      <PricingContent />
    </Suspense>
  );
}

function PricingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto py-12 px-6 space-y-12 animate-pulse">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-8 w-48 bg-slate-200 rounded-xl" />
        <div className="h-12 w-96 bg-slate-200 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-[500px] bg-white rounded-[2.5rem] border border-slate-100" />
        ))}
      </div>
    </div>
  );
}
