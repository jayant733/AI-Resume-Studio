"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/card";
import { analyzeJob, scrapeJob } from "@/lib/api";
import { loadState, mergeState } from "@/lib/storage";

export default function JobPage() {
  const router = useRouter();
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // URL scraper state
  const [jobUrl, setJobUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapedBanner, setScrapedBanner] = useState(false);

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

  async function handleScrape() {
    if (!jobUrl.trim()) return;
    setScraping(true);
    setScrapeError(null);
    setScrapedBanner(false);
    try {
      const result = await scrapeJob(jobUrl.trim());
      if (result.title) setJobTitle(result.title);
      if (result.company) setCompany(result.company);
      setDescription(result.description);
      setScrapedBanner(true);
    } catch (err) {
      setScrapeError(err instanceof Error ? err.message : "Could not scrape URL.");
    } finally {
      setScraping(false);
    }
  }

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
        job_description: description,
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
    <div className="space-y-6">
      {/* URL Scraper */}
      <Card title="Auto-fill from URL" description="Paste a job posting link to extract the description automatically.">
        <div className="flex gap-3">
          <input
            id="job-url-input"
            className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="https://linkedin.com/jobs/view/... or any job posting URL"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScrape()}
          />
          <button
            id="scrape-url-btn"
            className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white disabled:opacity-60 whitespace-nowrap"
            onClick={handleScrape}
            disabled={scraping || !jobUrl.trim()}
          >
            {scraping ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Fetching
              </span>
            ) : (
              "Fetch from URL"
            )}
          </button>
        </div>
        {scrapeError && <p className="mt-2 text-sm text-red-600">{scrapeError}</p>}
        {scrapedBanner && (
          <p className="mt-2 text-sm text-green-600 font-medium">
            ✓ Job description auto-filled from URL. Review the fields below before analyzing.
          </p>
        )}
      </Card>

      {/* Manual form */}
      <Card title="Analyze Job Fit" description="Paste or edit the target job description to run semantic matching and ATS gap analysis.">
        <div className="grid gap-4 md:grid-cols-2">
          <input
            id="job-title-input"
            className="rounded-2xl border border-slate-200 px-4 py-3"
            placeholder="Target role"
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
          />
          <input
            id="company-input"
            className="rounded-2xl border border-slate-200 px-4 py-3"
            placeholder="Company"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
          <textarea
            id="job-description-input"
            className="min-h-72 w-full rounded-3xl border border-slate-200 px-4 py-3 md:col-span-2"
            placeholder="Paste the full job description here..."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          {error ? <p className="md:col-span-2 text-sm text-red-600">{error}</p> : null}
          <div className="md:col-span-2 flex justify-end">
            <button
              id="analyze-job-btn"
              className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-white disabled:opacity-60"
              onClick={handleAnalyze}
              disabled={loading || !description.trim()}
            >
              {loading ? "Analyzing..." : "Run job matching"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
