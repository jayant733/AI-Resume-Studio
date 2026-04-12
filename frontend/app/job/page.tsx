"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/card";
import { analyzeJob } from "@/lib/api";
import { loadState, mergeState } from "@/lib/storage";

export default function JobPage() {
  const router = useRouter();
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const state = loadState();
    if (!state.upload) {
      router.replace("/upload");
      return;
    }
    setJobTitle(state.draftJobTitle || "");
    setCompany(state.draftCompany || "");
    setDescription(state.draftDescription || "");
  }, [router]);

  async function handleAnalyze() {
    const state = loadState();
    if (!state.upload) {
      router.replace("/upload");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeJob({
        resume_id: state.upload.resume_id,
        job_title: jobTitle,
        company,
        job_description: description
      });
      mergeState({ job: result, draftJobTitle: jobTitle, draftCompany: company, draftDescription: description });
      router.push("/suggestions");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Job analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Analyze Job Fit" description="Paste the target job description to run semantic matching and ATS gap analysis.">
      <div className="grid gap-4 md:grid-cols-2">
        <input
          className="rounded-2xl border border-slate-200 px-4 py-3"
          placeholder="Target role"
          value={jobTitle}
          onChange={(event) => setJobTitle(event.target.value)}
        />
        <input
          className="rounded-2xl border border-slate-200 px-4 py-3"
          placeholder="Company"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
        />
        <textarea
          className="min-h-72 w-full rounded-3xl border border-slate-200 px-4 py-3 md:col-span-2"
          placeholder="Paste the full job description here..."
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        {error ? <p className="md:col-span-2 text-sm text-red-600">{error}</p> : null}
        <div className="md:col-span-2 flex justify-end">
          <button className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-white" onClick={handleAnalyze}>
            {loading ? "Analyzing..." : "Run job matching"}
          </button>
        </div>
      </div>
    </Card>
  );
}
