"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
  Target, Loader2, Sparkles, FileText, 
  MessageSquare, ChevronRight, Zap, CheckCircle2, 
  AlertCircle, Download, ExternalLink, RefreshCw,
  Search, Briefcase, Cpu, ArrowRight, Lock
} from "lucide-react";
import { 
  analyzeJob, 
  generateInterviewQuestions, 
  generateResume, 
  generateCoverLetter,
  getJobStatus,
  resolvePdfUrl
} from "@/lib/api";
import { APP_STATE_KEY, loadState, mergeState } from "@/lib/storage";
import { 
  InterviewQuestionsResponse, 
  JobAnalysis, 
  CoverLetterResponse, 
  JobStatusResponse 
} from "@/lib/types";
import { clsx } from "clsx";

type Step = "input" | "analysis" | "actions";

export default function ToolsPage() {
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState<Step>("input");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  // AI Output State
  const [analysis, setAnalysis] = useState<JobAnalysis | null>(null);
  const [interviewResult, setInterviewResult] = useState<InterviewQuestionsResponse | null>(null);
  const [coverLetterResult, setCoverLetterResult] = useState<CoverLetterResponse | null>(null);
  const [genJobId, setGenJobId] = useState<number | null>(null);
  const [resumeResult, setResumeResult] = useState<any | null>(null);

  useEffect(() => {
    const state = (loadState(APP_STATE_KEY) || {}) as any;
    setUser(state.currentUser || null);
    setJobDescription(state.draftDescription || "");
    setJobTitle(state.draftJobTitle || "");
    setCompany(state.draftCompany || "");
  }, []);

  const isPro = user?.subscription_tier === "pro" || user?.subscription_tier === "premium";

  if (!isPro && user) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-6 relative min-h-screen">
        {/* Background Skeletons (The "Shimmer" of the page) */}
        <div className="space-y-12 blur-[2px] opacity-40 pointer-events-none select-none">
          <div className="flex items-center justify-between border-b border-slate-200 pb-8">
            <div className="flex items-center gap-8">
              <div className="h-10 w-32 animate-shimmer rounded-xl" />
              <div className="h-1 w-4 bg-slate-200" />
              <div className="h-10 w-32 animate-shimmer rounded-xl" />
            </div>
            <div className="h-4 w-24 animate-shimmer rounded-lg" />
          </div>

          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="h-3 w-16 bg-slate-200 rounded ml-2" />
                <div className="h-14 w-full animate-shimmer rounded-2xl" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-16 bg-slate-200 rounded ml-2" />
                <div className="h-14 w-full animate-shimmer rounded-2xl" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-24 bg-slate-200 rounded ml-2" />
              <div className="h-64 w-full animate-shimmer rounded-[2rem]" />
            </div>
            <div className="h-16 w-full animate-shimmer rounded-[2rem]" />
          </div>
        </div>

        {/* Lock Overlay */}
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-slate-50/10">
          <div className="w-full max-w-md bg-gradient-to-br from-blue-600 to-indigo-700 p-10 rounded-[2.5rem] shadow-2xl text-white text-center space-y-6 transform animate-in zoom-in duration-300">
             <div className="mx-auto w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                <Lock className="text-white" size={32} />
             </div>
             <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-[0.3em] opacity-80">Go Unlimited</p>
                <h2 className="text-3xl font-black tracking-tight">Upgrade to Pro</h2>
             </div>
             <p className="text-blue-100 font-medium text-sm leading-relaxed">
                Unlock the full power of AI-powered job matching, automated cover letters, and advanced interview coaching.
             </p>
             <Link 
               href="/pricing" 
               className="block w-full py-4 bg-white text-blue-600 rounded-2xl font-black text-lg shadow-xl shadow-blue-900/20 hover:bg-slate-50 transition active:scale-95"
             >
                Upgrade Now
             </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleAnalyze = async () => {
    const state = (loadState(APP_STATE_KEY) || {}) as any;
    const resumeId = state.upload?.resume_id;
    if (!resumeId) {
      setError("Please upload a resume first.");
      return;
    }
    if (!jobDescription) {
      setError("Please provide a job description.");
      return;
    }

    setLoading("analysis");
    setError(null);
    try {
      const result = await analyzeJob({
        resume_id: resumeId,
        job_title: jobTitle,
        company,
        job_description: jobDescription
      }, state.authToken);
      setAnalysis(result);
      setStep("analysis");
      // Save for later
      mergeState(APP_STATE_KEY, { 
        draftJobTitle: jobTitle, 
        draftCompany: company, 
        draftDescription: jobDescription 
      });
    } catch (e: any) {
      setError(e.message || "Job analysis failed.");
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateQuestions = async () => {
    setLoading("interview");
    try {
      const state = (loadState(APP_STATE_KEY) || {}) as any;
      const data = await generateInterviewQuestions({
        resume_id: state.upload?.resume_id,
        job_title: jobTitle,
        job_description: jobDescription,
      }, state.authToken);
      setInterviewResult(data);
    } catch (e: any) {
      setError(e.message || "Failed to generate questions.");
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateCoverLetter = async () => {
    setLoading("cover_letter");
    try {
      const state = (loadState(APP_STATE_KEY) || {}) as any;
      const data = await generateCoverLetter({
        resume_id: state.upload?.resume_id,
        job_id: analysis?.job_id as number,
      });
      setCoverLetterResult(data);
    } catch (e: any) {
      setError(e.message || "Failed to generate cover letter.");
    } finally {
      setLoading(null);
    }
  };

  const handleOptimizeResume = async () => {
    setLoading("resume");
    try {
      const state = (loadState(APP_STATE_KEY) || {}) as any;
      const { job_id } = await generateResume({
        resume_id: state.upload?.resume_id,
        job_id: analysis?.job_id as number,
        tone: "professional",
      }, state.authToken);
      setGenJobId(job_id);
      pollJobStatus(job_id);
    } catch (e: any) {
      setError(e.message || "Failed to start optimization.");
      setLoading(null);
    }
  };

  const pollJobStatus = async (id: number) => {
    const timer = setInterval(async () => {
      try {
        const status = await getJobStatus(id);
        if (status.status === "done") {
          setResumeResult(status.result);
          setLoading(null);
          clearInterval(timer);
        } else if (status.status === "failed") {
          setError(status.error || "Optimization failed.");
          setLoading(null);
          clearInterval(timer);
        }
      } catch {
        clearInterval(timer);
        setLoading(null);
      }
    }, 2000);
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-6 space-y-12">
      {/* Step Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-8">
        <div className="flex items-center gap-8">
          <StepBadge active={step === "input"} done={step !== "input"} num={1} label="Target Job" />
          <ChevronRight className="text-slate-300" size={16} />
          <StepBadge active={step === "analysis"} done={step === "actions"} num={2} label="AI Intelligence" />
          <ChevronRight className="text-slate-300" size={16} />
          <StepBadge active={step === "actions"} done={false} num={3} label="Execute Workflow" />
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <Cpu size={14} className="text-blue-600" />
          AI Workflow System
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 p-6 rounded-[2rem] flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
          <AlertCircle size={24} />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      {/* Step 1: Input */}
      {step === "input" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">Job Title</label>
                <input 
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Product Designer"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold focus:ring-2 focus:ring-blue-600 outline-none transition"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">Company</label>
                <input 
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="e.g. Stripe"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold focus:ring-2 focus:ring-blue-600 outline-none transition"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">Job Description</label>
              <textarea 
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here..."
                className="w-full h-64 bg-slate-50 border border-slate-200 rounded-[2rem] px-6 py-6 text-slate-700 font-medium focus:ring-2 focus:ring-blue-600 outline-none transition resize-none"
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading === "analysis" || !jobDescription}
              className="w-full py-5 rounded-[2rem] bg-slate-900 text-white font-black text-lg flex items-center justify-center gap-3 hover:bg-slate-800 transition disabled:opacity-50"
            >
              {loading === "analysis" ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
              {loading === "analysis" ? "Analyzing Job Requirements..." : "Initiate AI Intelligence"}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Analysis */}
      {step === "analysis" && analysis && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <AnalysisCard 
              title="Required Skills" 
              items={analysis.missing_skills} 
              icon={<Target className="text-red-500" />} 
              type="missing"
            />
            <AnalysisCard 
              title="Matched Strengths" 
              items={analysis.matched_skills} 
              icon={<CheckCircle2 className="text-emerald-500" />} 
              type="matched"
            />
          </div>

          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <Sparkles className="text-blue-600" size={24} />
              AI Strategic Recommendations
            </h3>
            <div className="space-y-4">
              {analysis.recommendations.map((rec, i) => (
                <div key={i} className="flex gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black shrink-0">{i+1}</div>
                  <p className="text-sm font-bold text-slate-700">{rec}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStep("actions")}
            className="w-full py-5 rounded-[2rem] bg-blue-600 text-white font-black text-lg flex items-center justify-center gap-3 hover:bg-blue-700 shadow-xl shadow-blue-100 transition"
          >
            Deploy Workflow
            <ArrowRight size={24} />
          </button>
        </div>
      )}

      {/* Step 3: Actions */}
      {step === "actions" && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <WorkflowAction 
              title="Optimize Resume" 
              sub="ATS-alignment for this role"
              icon={<FileText size={24} />}
              loading={loading === "resume"}
              onClick={handleOptimizeResume}
              result={resumeResult}
              resultType="resume"
            />
            <WorkflowAction 
              title="Interview Prep" 
              sub="Generate tailored questions"
              icon={<MessageSquare size={24} />}
              loading={loading === "interview"}
              onClick={handleGenerateQuestions}
              result={interviewResult}
              resultType="interview"
            />
            <WorkflowAction 
              title="Cover Letter" 
              sub="Write matching cover letter"
              icon={<Zap size={24} />}
              loading={loading === "cover_letter"}
              onClick={handleGenerateCoverLetter}
              result={coverLetterResult}
              resultType="cover_letter"
            />
          </div>

          {/* Detailed Output Displays */}
          {interviewResult && <InterviewOutput data={interviewResult} />}
          {coverLetterResult && <CoverLetterOutput data={coverLetterResult} />}
        </div>
      )}
    </div>
  );
}

function StepBadge({ active, done, num, label }: { active: boolean, done: boolean, num: number, label: string }) {
  return (
    <div className={clsx(
      "flex items-center gap-3 transition-opacity",
      active ? "opacity-100" : done ? "opacity-60" : "opacity-30"
    )}>
      <div className={clsx(
        "h-8 w-8 rounded-full flex items-center justify-center text-xs font-black",
        active ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
      )}>
        {done ? <CheckCircle2 size={16} /> : num}
      </div>
      <span className={clsx("text-sm font-black", active ? "text-slate-900" : "text-slate-500")}>{label}</span>
    </div>
  );
}

function AnalysisCard({ title, items, icon, type }: any) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-50 rounded-xl">{icon}</div>
        <h3 className="text-lg font-black text-slate-900">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item: string, i: number) => (
          <span key={i} className={clsx(
            "px-4 py-2 rounded-xl text-xs font-bold border",
            type === "missing" ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
          )}>
            {item}
          </span>
        ))}
        {items.length === 0 && <p className="text-xs text-slate-400 font-medium italic">None identified.</p>}
      </div>
    </div>
  );
}

function WorkflowAction({ title, sub, icon, loading, onClick, result, resultType }: any) {
  const isDone = !!result;
  return (
    <div className={clsx(
      "bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-4 transition-all",
      isDone && "border-blue-500 bg-blue-50/20"
    )}>
      <div className={clsx(
        "p-4 rounded-2xl",
        isDone ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "bg-slate-100 text-slate-400"
      )}>
        {loading ? <Loader2 className="animate-spin" size={24} /> : icon}
      </div>
      <div>
        <h4 className="font-black text-slate-900">{title}</h4>
        <p className="text-xs text-slate-500 font-medium">{sub}</p>
      </div>
      <button
        onClick={onClick}
        disabled={loading || isDone}
        className={clsx(
          "w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition",
          isDone ? "bg-emerald-100 text-emerald-600" : "bg-slate-900 text-white hover:bg-slate-800"
        )}
      >
        {loading ? "Processing..." : isDone ? "Completed" : "Start Task"}
      </button>
      {isDone && resultType === "resume" && (
        <Link 
          href={`/preview?output_id=${result.output_id}`}
          className="text-xs font-black text-blue-600 flex items-center gap-1 hover:underline"
        >
          View Optimized PDF <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

function InterviewOutput({ data }: { data: InterviewQuestionsResponse }) {
  return (
    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm animate-in fade-in zoom-in-95">
      <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
        <MessageSquare className="text-purple-600" size={24} />
        Interview Strategy Guide
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <QuestionBlock title="Technical Deep Dive" items={data.technical_questions} />
        <QuestionBlock title="Behavioral Alignment" items={data.behavioral_questions} />
        <QuestionBlock title="Project Deep Dives" items={data.project_questions} />
      </div>
    </div>
  );
}

function QuestionBlock({ title, items }: any) {
  return (
    <div className="space-y-4">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{title}</h4>
      <div className="space-y-2">
        {items.map((q: string, i: number) => (
          <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-bold text-slate-700 leading-relaxed">
            {q}
          </div>
        ))}
      </div>
    </div>
  );
}

function CoverLetterOutput({ data }: { data: CoverLetterResponse }) {
  return (
    <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-xl animate-in fade-in zoom-in-95">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-black flex items-center gap-3">
          <Sparkles className="text-blue-400" size={24} />
          AI Generated Cover Letter
        </h3>
        <a 
          href={resolvePdfUrl(data.pdf_download_url)} 
          target="_blank" 
          className="flex items-center gap-2 px-5 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black transition"
        >
          <Download size={14} /> Download PDF
        </a>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-sm font-medium leading-loose text-white/80 whitespace-pre-wrap font-serif">
        {data.cover_letter_text}
      </div>
    </div>
  );
}
