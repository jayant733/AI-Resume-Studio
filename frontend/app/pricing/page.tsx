"use client";

import { CheckIcon } from "lucide-react";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (tier: string) => {
    setLoading(tier);
    try {
      const res = await fetch("http://localhost:8000/stripe/create-checkout-session?email=demo@user.com&target_tier=" + tier, {
        method: "POST"
      });
      const data = await res.json();
      if (data.url) {
        // Stripe returns a checkout URL or mock redirects to this page
        router.push(data.url);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const tiers = [
    {
      name: "Free",
      price: "$0",
      description: "Everything you need to get a basic resume going.",
      features: ["ATS Parsing", "Basic Resume Optimization", "PDF Export"],
      buttonText: "Current Plan",
      action: () => {},
      isPopular: false
    },
    {
      name: "Pro",
      price: "$15",
      description: "Perfect for serious job seekers.",
      features: ["Everything in Free", "Cover Letter Generation", "LinkedIn Bio Optimizer", "Priority Support"],
      buttonText: "Upgrade to Pro",
      action: () => handleUpgrade("pro"),
      isPopular: true
    },
    {
      name: "Premium",
      price: "$29",
      description: "The ultimate arsenal for FAANG prep.",
      features: ["Everything in Pro", "Unlimited AI Career Chatbot", "Mock Interview Generator", "1-on-1 Feedback"],
      buttonText: "Upgrade to Premium",
      action: () => handleUpgrade("premium"),
      isPopular: false
    }
  ];

  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-accent uppercase tracking-widest">Pricing</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Choose the right tier for your career
          </p>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-slate">
          Whether you just need a quick format or a full mock interview suite, we have you covered.
        </p>

        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8 lg:gap-y-0">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-[32px] p-8 xl:p-10 transition-all duration-300 relative ${
                tier.isPopular 
                  ? "bg-ink text-white shadow-2xl scale-105 z-10" 
                  : "bg-white/80 backdrop-blur-sm border border-slate/10 shadow-soft text-ink hover:-translate-y-1"
              }`}
            >
              {tier.isPopular && (
                <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 rounded-full bg-accent px-4 py-1 text-xs font-semibold text-white">
                  Most Popular
                </div>
              )}
              <h3 className="text-2xl font-bold">{tier.name}</h3>
              <p className={`mt-4 text-sm leading-6 ${tier.isPopular ? "text-slate-300" : "text-slate"}`}>{tier.description}</p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-4xl font-bold tracking-tight">{tier.price}</span>
                <span className="text-sm font-semibold leading-6">/month</span>
              </p>
              <button
                onClick={tier.action}
                disabled={loading === tier.name.toLowerCase()}
                className={`mt-8 block w-full rounded-full px-3 py-3 text-center text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition ${
                  tier.isPopular
                    ? "bg-white text-ink hover:bg-mist focus-visible:outline-white"
                    : "bg-ink text-white hover:bg-ink/90 focus-visible:outline-ink"
                }`}
              >
                {loading === tier.name.toLowerCase() ? "Processing..." : tier.buttonText}
              </button>
              <ul className={`mt-8 space-y-3 text-sm leading-6 ${tier.isPopular ? "text-slate-300" : "text-slate"}`}>
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-x-3">
                    <CheckIcon className={`h-6 w-5 flex-none ${tier.isPopular ? "text-accent" : "text-ink"}`} aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
