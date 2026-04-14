"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/card";
import { DiffView } from "@/components/diff-view";
import { ResumePreview } from "@/components/resume-preview";
import { generateCoverLetter, getATSScore, getDiff, resolvePdfUrl } from "@/lib/api";
import { loadState } from "@/lib/storage";
import {
  ATSScoreResponse,
  CoverLetterResponse,
  DiffResponse,
  GeneratedResume,
  UploadResponse,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// ATS Gauge
// ---------------------------------------------------------------------------
function ATSGauge({ score }: { score: number }) {
  const clamp = Math.min(100, Math.max(0, score));
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - clamp / 100);
  const color = clamp >= 75 ? "#22c55e" : clamp >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="80" viewBox="0 0 140 80">
        {/* Track */}
        <path
          d="M 20 74 A 52 52 0 0 1 120 74"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Progress */}
        <path
          d="M 20 74 A 52 52 0 0 1 120 74"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(circ / 2) * (clamp / 100)} ${circ}`}
          className="transition-all duration-1000"
        />
        <text x="70" y="66" textAnchor="middle" fontSize="26" fontWeight="bold" fill={color}>
          {clamp}
        </text>
      </svg>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate">ATS Score</p>
    </div>
  );
}

function DimBar({ label, score, detail }: { label: string; score: number; detail: string }) {
  const pct = Math.round(score * 100);
  const color = pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-slate">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-slate/80">{detail}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab bar
// ---------------------------------------------------------------------------
type Tab = "preview" | "diff" | "ats" | "cover";

function Tabs({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "preview", label: "Preview" },
    { id: "diff", label: "Before vs After" },
    { id: "ats", label: "ATS Score" },
    { id: "cover", label: "Cover Letter" },
  ];
  return (
    <div className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          id={`tab-${t.id}`}
          onClick={() => onChange(t.id)}
          className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
            active === t.id
              ? "bg-ink text-white shadow-sm"
              : "text-slate hover:bg-mist"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function PreviewPage() {
  const router = useRouter();
  const [upload, setUpload] = useState<UploadResponse | null>(null);
  const [generated, setGenerated] = useState<GeneratedResume | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("preview");

  // ATS
  const [atsData, setAtsData] = useState<ATSScoreResponse | null>(null);
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsError, setAtsError] = useState<string | null>(null);

  // Diff
  const [diffData, setDiffData] = useState<DiffResponse | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  // Cover letter
  const [coverData, setCoverData] = useState<CoverLetterResponse | null>(null);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);

  useEffect(() => {
    const state = loadState();
    if (!state.upload) {
      router.replace("/upload");
      return;
    }
    setUpload(state.upload);
    setGenerated(state.generated || null);
  }, [router]);

  // Lazy-load diff / ATS / cover when tab activated
  useEffect(() => {
    if (!generated) return;
    if (activeTab === "diff" && !diffData && !diffLoading) {
      setDiffLoading(true);
      getDiff(generated.output_id)
        .then(setDiffData)
        .catch(() => {})
        .finally(() => setDiffLoading(false));
    }
    if (activeTab === "ats" && !atsData && !atsLoading) {
      setAtsLoading(true);
      getATSScore(generated.output_id)
        .then(setAtsData)
        .catch((e) => setAtsError(e.message))
        .finally(() => setAtsLoading(false));
    }
  }, [activeTab, generated, diffData, diffLoading, atsData, atsLoading]);

  async function handleGenerateCoverLetter() {
    const state = loadState();
    if (!state.upload || !state.job) return;
    setCoverLoading(true);
    setCoverError(null);
    try {
      const result = await generateCoverLetter({
        resume_id: state.upload.resume_id,
        job_id: state.job.job_id,
        tone: "professional",
      });
      setCoverData(result);
    } catch (e) {
      setCoverError(e instanceof Error ? e.message : "Failed to generate cover letter.");
    } finally {
      setCoverLoading(false);
    }
  }

  if (!upload) return null;

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <Card title="Resume Output" description="Review your generated resume across all dimensions.">
        <div className="space-y-4">
          <p className="text-sm text-ink/80">
            Candidate: <span className="font-medium">{upload.parsed_resume.name || "Unknown"}</span>
          </p>
          <div className="flex flex-wrap gap-3">
            {generated && (
              <a
                id="download-pdf-btn"
                className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-white"
                href={resolvePdfUrl(generated.pdf_download_url)}
                target="_blank"
                rel="noreferrer"
              >
                Download PDF
              </a>
            )}
            <Link
              className="rounded-full border border-slate-300 px-6 py-3 text-sm font-medium text-ink"
              href="/suggestions"
            >
              Back to suggestions
            </Link>
          </div>
        </div>
      </Card>

      {/* Tab navigation — only show when generated resume is available */}
      {generated && <Tabs active={activeTab} onChange={setActiveTab} />}

      {/* Tab content */}
      {activeTab === "preview" && (
        <ResumePreview
          parsedResume={upload.parsed_resume}
          generated={(generated?.optimized_resume || undefined) as Record<string, unknown> | undefined}
        />
      )}

      {activeTab === "diff" && generated && (
        <div className="rounded-[28px] border border-slate-200 bg-white/95 p-8 shadow-soft">
          <h2 className="mb-6 text-lg font-semibold text-ink">Before vs. After — AI Changes</h2>
          {diffLoading && <p className="text-sm text-slate animate-pulse">Loading diff…</p>}
          {diffData && <DiffView original={diffData.original} optimized={diffData.optimized} />}
        </div>
      )}

      {activeTab === "ats" && generated && (
        <div className="rounded-[28px] border border-slate-200 bg-white/95 p-8 shadow-soft space-y-6">
          <h2 className="text-lg font-semibold text-ink">ATS Score Analysis</h2>
          {atsLoading && <p className="text-sm text-slate animate-pulse">Computing score…</p>}
          {atsError && <p className="text-sm text-red-600">{atsError}</p>}
          {atsData && (
            <div className="space-y-6">
              <ATSGauge score={atsData.total_score} />
              <div className="grid gap-4 md:grid-cols-2">
                <DimBar
                  label={atsData.keyword_density.label}
                  score={atsData.keyword_density.score}
                  detail={atsData.keyword_density.detail}
                />
                <DimBar
                  label={atsData.action_verb_rate.label}
                  score={atsData.action_verb_rate.score}
                  detail={atsData.action_verb_rate.detail}
                />
                <DimBar
                  label={atsData.quantification_rate.label}
                  score={atsData.quantification_rate.score}
                  detail={atsData.quantification_rate.detail}
                />
                <DimBar
                  label={atsData.section_completeness.label}
                  score={atsData.section_completeness.score}
                  detail={atsData.section_completeness.detail}
                />
              </div>
              {atsData.improvement_tips.length > 0 && (
                <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                  <p className="text-sm font-semibold text-amber-700 mb-2">Improvement Tips</p>
                  <ul className="space-y-1 list-disc pl-4">
                    {atsData.improvement_tips.map((tip, i) => (
                      <li key={i} className="text-xs text-amber-800">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "cover" && (
        <div className="rounded-[28px] border border-slate-200 bg-white/95 p-8 shadow-soft space-y-5">
          <h2 className="text-lg font-semibold text-ink">Cover Letter</h2>
          {!coverData && (
            <div className="space-y-3">
              <p className="text-sm text-slate">
                Generate a tailored cover letter based on your optimized resume and the target job description.
              </p>
              <button
                id="generate-cover-letter-btn"
                className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-white disabled:opacity-60"
                onClick={handleGenerateCoverLetter}
                disabled={coverLoading}
              >
                {coverLoading ? "Generating cover letter…" : "Generate Cover Letter"}
              </button>
              {coverError && <p className="text-sm text-red-600">{coverError}</p>}
            </div>
          )}
          {coverData && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-mist/50 p-6 whitespace-pre-wrap text-sm leading-8 text-ink/90 font-serif">
                {coverData.cover_letter_text}
              </div>
              <div className="flex gap-3">
                <a
                  id="download-cover-letter-btn"
                  className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-white"
                  href={resolvePdfUrl(coverData.pdf_download_url)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download PDF
                </a>
                <button
                  className="rounded-full border border-slate-300 px-6 py-3 text-sm text-ink"
                  onClick={() => setCoverData(null)}
                >
                  Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
