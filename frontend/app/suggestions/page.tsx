"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/card";
import { generateResume } from "@/lib/api";
import { loadState, mergeState } from "@/lib/storage";
import { JobAnalysis, UploadResponse } from "@/lib/types";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-mist p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-slate">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

export default function SuggestionsPage() {
  const router = useRouter();
  const [job, setJob] = useState<JobAnalysis | null>(null);
  const [upload, setUpload] = useState<UploadResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const state = loadState();
    if (!state.upload || !state.job) {
      router.replace("/upload");
      return;
    }
    setJob(state.job);
    setUpload(state.upload);
  }, [router]);

  async function handleGenerate() {
    const state = loadState();
    if (!state.upload || !state.job) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const generated = await generateResume({
        resume_id: state.upload.resume_id,
        job_id: state.job.job_id,
        tone: "professional",
        additional_context: "Optimize for ATS screening and recruiter readability."
      });
      mergeState({ generated });
      router.push("/preview");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Resume generation failed.");
    } finally {
      setLoading(false);
    }
  }

  if (!job || !upload) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Semantic Match" value={`${Math.round(job.semantic_score * 100)}%`} />
        <Metric label="Matched Skills" value={String(job.matched_skills.length)} />
        <Metric label="Missing Skills" value={String(job.missing_skills.length)} />
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
                    <p className="mt-1 text-xs text-slate">Distance: {item.distance.toFixed(3)}</p>
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

        <Card title="Resume Snapshot" description="Parsed data ready for AI rewriting.">
          <div className="space-y-3 text-sm">
            <p><span className="font-medium">Candidate:</span> {upload.parsed_resume.name || "Unknown"}</p>
            <p><span className="font-medium">Headline:</span> {upload.parsed_resume.headline || "Not detected"}</p>
            <p><span className="font-medium">Image caption:</span> {upload.image_caption || "No image uploaded"}</p>
            <p><span className="font-medium">Skills:</span> {upload.parsed_resume.skills.join(", ") || "No structured skills found"}</p>
            <div className="pt-4">
              <button className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-white" onClick={handleGenerate}>
                {loading ? "Generating..." : "Generate optimized resume"}
              </button>
              {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
