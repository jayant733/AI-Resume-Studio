"use client";

import React, { useEffect, useState } from "react";
import { Linkedin, Target, Loader2 } from "lucide-react";
import { generateInterviewQuestions, generateLinkedinProfile } from "@/lib/api";
import { loadState } from "@/lib/storage";
import { InterviewQuestionsResponse } from "@/lib/types";

export default function ToolsPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [linkedinResult, setLinkedinResult] = useState<{ headline?: string; about?: string } | null>(null);
  const [interviewResult, setInterviewResult] = useState<InterviewQuestionsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  useEffect(() => {
    const state = loadState();
    setJobDescription(state.draftDescription || "");
    setJobTitle(state.draftJobTitle || "");
  }, []);

  const handleGenerateLinkedin = async () => {
    const state = loadState();
    if (!state.authToken || !state.upload?.resume_id) {
      setError("Please log in and upload a resume first.");
      return;
    }

    setLoading("linkedin");
    setError(null);
    try {
      const data = await generateLinkedinProfile({ resume_id: state.upload.resume_id }, state.authToken);
      setLinkedinResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate LinkedIn content.");
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateInterview = async () => {
    const state = loadState();
    if (!jobDescription.trim()) {
      setError("Please provide a job description first.");
      return;
    }

    setLoading("interview");
    setError(null);
    try {
      const data = await generateInterviewQuestions(
        {
          resume_id: state.upload?.resume_id,
          job_title: jobTitle,
          job_description: jobDescription,
        },
        state.authToken
      );
      setInterviewResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate interview questions.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Career Tools</h1>
        <p className="text-slate mt-2">Use your saved resume plus target job context to generate tailored career prep assets.</p>
      </div>

      {error && (
        <div className="mb-8 rounded-xl bg-red-50 border border-red-200 p-4 text-red-600">
          {error}
        </div>
      )}

      <div className="mb-8 rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-ink">Interview Input</h2>
        <div className="mt-4 grid gap-4">
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3"
            placeholder="Target job title"
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
          />
          <textarea
            className="min-h-48 rounded-3xl border border-slate-200 px-4 py-3"
            placeholder="Paste the target job description here..."
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="rounded-[32px] border border-white/70 bg-white/60 p-8 shadow-soft backdrop-blur-md flex flex-col items-start transition hover:-translate-y-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 mb-6">
            <Linkedin className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-ink">LinkedIn Optimizer</h2>
          <p className="text-slate text-sm mt-2 flex-1">
            Generate a more polished headline and About section using your stored resume.
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

        <div className="rounded-[32px] border border-white/70 bg-white/60 p-8 shadow-soft backdrop-blur-md flex flex-col items-start transition hover:-translate-y-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent mb-6">
            <Target className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-ink">Interview Question Generator</h2>
          <p className="text-slate text-sm mt-2 flex-1">
            Generate progressively harder technical, behavioral, and project deep-dive questions from your actual experience and the target role.
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
            <div className="w-full mt-8 space-y-6 p-6 rounded-2xl bg-white border border-slate/10 shadow-sm">
              <QuestionSection title="Technical Questions" items={interviewResult.technical_questions} />
              <QuestionSection title="Behavioral Questions" items={interviewResult.behavioral_questions} />
              <QuestionSection title="Project Deep Dives" items={interviewResult.project_questions} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-slate mb-4">{title}</h3>
      <ul className="space-y-4">
        {items.map((question, idx) => (
          <li key={`${title}-${idx}`} className="flex gap-3 text-sm text-ink items-start">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mist text-xs font-bold text-accent">
              {idx + 1}
            </span>
            <span className="leading-6 font-medium">{question}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
