"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/card";
import { generateResume, getJobStatus } from "@/lib/api";
import { loadState, mergeState } from "@/lib/storage";
import { JobAnalysis, UploadResponse } from "@/lib/types";

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-3xl bg-mist p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-slate">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate">{sub}</p>}
    </div>
  );
}

const TEMPLATES = [
  { id: "classic", label: "Classic", desc: "Clean single-column, ATS-safe" },
  { id: "modern", label: "Modern", desc: "Two-column with dark sidebar" },
  { id: "minimal", label: "Minimal", desc: "Elegant serif typography" },
];

const PIPELINE_STEPS = [
  "Parsing resume",
  "Embedding fragments",
  "Retrieving context",
  "Optimizing with AI",
  "Rendering PDF",
];

export default function SuggestionsPage() {
  const router = useRouter();
  const [job, setJob] = useState<JobAnalysis | null>(null);
  const [upload, setUpload] = useState<UploadResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const [currentStep, setCurrentStep] = useState(-1);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const state = loadState();
    if (!state.upload || !state.job) {
      router.replace("/upload");
      return;
    }
    setJob(state.job);
    setUpload(state.upload);
  }, [router]);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function handleGenerate() {
    const state = loadState();
    if (!state.upload || !state.job) return;

    setLoading(true);
    setError(null);
    setCurrentStep(0);

    try {
      const { job_id } = await generateResume({
        resume_id: state.upload.resume_id,
        job_id: state.job.job_id,
        tone: "professional",
        additional_context: "Optimize for ATS screening and recruiter readability.",
        template_id: selectedTemplate,
      }, state.authToken);

      // Animate pipeline steps while polling
      let step = 0;
      pollRef.current = setInterval(async () => {
        step = Math.min(step + 1, PIPELINE_STEPS.length - 1);
        setCurrentStep(step);

        try {
          const status = await getJobStatus(job_id);
          if (status.status === "done" && status.result) {
            stopPolling();
            mergeState({ generated: status.result });
            router.push("/preview");
          } else if (status.status === "failed") {
            stopPolling();
            setError(status.error || "Generation failed.");
            setLoading(false);
            setCurrentStep(-1);
          }
        } catch {
          // ignore individual poll errors
        }
      }, 1500);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Resume generation failed.");
      setLoading(false);
      setCurrentStep(-1);
    }
  }

  useEffect(() => () => stopPolling(), []);

  if (!job || !upload) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric
          label="Semantic Match"
          value={`${Math.round(job.semantic_score * 100)}%`}
          sub="Vector similarity score"
        />
        <Metric
          label="Matched Skills"
          value={String(job.matched_skills.length)}
          sub={job.matched_skills.slice(0, 3).join(", ") || "—"}
        />
        <Metric
          label="Missing Skills"
          value={String(job.missing_skills.length)}
          sub={job.missing_skills.slice(0, 3).join(", ") || "None — perfect fit!"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <Card title="AI Suggestions" description="Retrieved resume fragments and ATS guidance informed by vector search.">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-ink">Relevant experience</p>
              <div className="mt-3 space-y-3">
                {job.relevant_experience.map((item, index) => (
                  <div key={index} className="rounded-2xl border border-slate-200 px-4 py-3">
                    <p className="text-sm text-ink">{item.fragment}</p>
                    <p className="mt-1 text-xs text-slate">Similarity distance: {item.distance.toFixed(3)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-ink">Recommendations</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink/90">
                {job.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          {/* Template Picker */}
          <Card title="Choose Template" description="Select a PDF layout for your optimized resume.">
            <div className="grid gap-3">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  id={`template-${tpl.id}`}
                  onClick={() => setSelectedTemplate(tpl.id)}
                  className={`rounded-2xl border-2 px-4 py-3 text-left transition-all ${
                    selectedTemplate === tpl.id
                      ? "border-accent bg-accent/5"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <p className="text-sm font-semibold text-ink">{tpl.label}</p>
                  <p className="text-xs text-slate">{tpl.desc}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Generate button + pipeline steps */}
          <Card title="Resume Snapshot" description="Parsed data ready for AI rewriting.">
            <div className="space-y-3 text-sm">
              <p><span className="font-medium">Candidate:</span> {upload.parsed_resume.name || "Unknown"}</p>
              <p><span className="font-medium">Headline:</span> {upload.parsed_resume.headline || "Not detected"}</p>
              <p><span className="font-medium">Skills:</span> {upload.parsed_resume.skills.join(", ") || "No structured skills found"}</p>

              {loading && currentStep >= 0 && (
                <div className="mt-4 space-y-2">
                  {PIPELINE_STEPS.map((step, idx) => (
                    <div key={step} className="flex items-center gap-3">
                      <div
                        className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          idx < currentStep
                            ? "bg-green-500 text-white"
                            : idx === currentStep
                            ? "bg-accent text-white animate-pulse"
                            : "bg-slate-200 text-slate-400"
                        }`}
                      >
                        {idx < currentStep ? "✓" : idx + 1}
                      </div>
                      <span
                        className={`text-xs transition-all ${
                          idx === currentStep ? "font-semibold text-ink" : "text-slate"
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4">
                <button
                  id="generate-resume-btn"
                  className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-white disabled:opacity-60"
                  onClick={handleGenerate}
                  disabled={loading}
                >
                  {loading ? "Generating…" : "Generate optimized resume"}
                </button>
                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
