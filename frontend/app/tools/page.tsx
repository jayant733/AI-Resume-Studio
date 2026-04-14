"use client";

import React, { useState } from "react";
import { Linkedin, Target, Loader2 } from "lucide-react";

export default function ToolsPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [linkedinResult, setLinkedinResult] = useState<{ headline?: string; about?: string } | null>(null);
  const [interviewResult, setInterviewResult] = useState<{ questions?: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateLinkedin = async () => {
    setLoading("linkedin");
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/products/linkedin-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Hardcoding user_id=1 and resume_id=1 for demonstration
        body: JSON.stringify({ user_id: 1, resume_id: 1 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to generate");
      setLinkedinResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateInterview = async () => {
    setLoading("interview");
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/products/mock-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: 1, resume_id: 1, job_id: 1 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to generate");
      setInterviewResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-4">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Premium Tools</h1>
        <p className="text-slate mt-2">Leverage your parsed resume to instantly prepare for what comes next.</p>
      </div>

      {error && (
        <div className="mb-8 rounded-xl bg-red-50 border border-red-200 p-4 text-red-600">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* LinkedIn Optimizer Card */}
        <div className="rounded-[32px] border border-white/70 bg-white/60 p-8 shadow-soft backdrop-blur-md flex flex-col items-start transition hover:-translate-y-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 mb-6">
            <Linkedin className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-ink">LinkedIn Optimizer</h2>
          <p className="text-slate text-sm mt-2 flex-1">
            Turn your dry resume into a high-converting, story-driven LinkedIn About section and SEO Title.
          </p>
          
          <button 
            onClick={handleGenerateLinkedin}
            disabled={loading === "linkedin"}
            className="mt-8 flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink/90 disabled:opacity-70 transition"
          >
            {loading === "linkedin" && <Loader2 className="h-4 w-4 animate-spin" />}
            Generate Profile Content
          </button>

          {linkedinResult && (
            <div className="w-full mt-8 p-6 rounded-2xl bg-white border border-slate/10 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate mb-2">Headline</p>
              <p className="text-ink font-medium text-lg leading-snug">{linkedinResult.headline}</p>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate mt-6 mb-2">About Section</p>
              <p className="text-slate text-sm leading-relaxed whitespace-pre-line">{linkedinResult.about}</p>
            </div>
          )}
        </div>

        {/* Mock Interview Card */}
        <div className="rounded-[32px] border border-white/70 bg-white/60 p-8 shadow-soft backdrop-blur-md flex flex-col items-start transition hover:-translate-y-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent mb-6">
            <Target className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-ink">Mock Interview Studio</h2>
          <p className="text-slate text-sm mt-2 flex-1">
            Automatically generate 5 targeted behavioral and technical questions based on the intersection of your resume and target job.
          </p>

          <button 
            onClick={handleGenerateInterview}
            disabled={loading === "interview"}
            className="mt-8 flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-70 transition"
          >
             {loading === "interview" && <Loader2 className="h-4 w-4 animate-spin" />}
            Generate Questions
          </button>

          {interviewResult && (
            <div className="w-full mt-8 p-6 rounded-2xl bg-white border border-slate/10 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate mb-4">Your Custom Questions</h3>
              <ul className="space-y-4">
                {interviewResult.questions?.map((q, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-ink items-start">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mist text-xs font-bold text-accent">
                      {idx + 1}
                    </span>
                    <span className="leading-6 font-medium">{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
