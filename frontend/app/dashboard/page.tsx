"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { Card } from "@/components/card";
import { rankCandidates, uploadResume } from "@/lib/api";
import { loadState } from "@/lib/storage";
import { CandidateRankingItem } from "@/lib/types";

type UploadedCandidate = {
  resumeId: number;
  name: string;
  filename: string;
  headline?: string | null;
};

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "experience", label: "Experience" },
  { value: "skills_match", label: "Skills Match" },
];

export default function RecruiterDashboardPage() {
  const [uploadedCandidates, setUploadedCandidates] = useState<UploadedCandidate[]>([]);
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [sortBy, setSortBy] = useState("relevance");
  const [minScore, setMinScore] = useState(0);
  const [skillFilter, setSkillFilter] = useState("");
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [loadingRank, setLoadingRank] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ranking, setRanking] = useState<CandidateRankingItem[]>([]);

  async function handleBulkUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const state = loadState();
    setLoadingUpload(true);
    setError(null);

    try {
      const nextCandidates: UploadedCandidate[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("resume_file", file);
        formData.append("full_name", file.name.replace(/\.[^.]+$/, ""));
        const result = await uploadResume(formData, state.authToken);
        nextCandidates.push({
          resumeId: result.resume_id,
          name: result.parsed_resume.name || file.name.replace(/\.[^.]+$/, ""),
          filename: file.name,
          headline: result.parsed_resume.headline,
        });
      }
      setUploadedCandidates((current) => [...current, ...nextCandidates]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload one or more resumes.");
    } finally {
      setLoadingUpload(false);
      event.target.value = "";
    }
  }

  async function handleRankCandidates() {
    if (!jobDescription.trim() || uploadedCandidates.length === 0) {
      setError("Upload resumes and provide a job description before ranking.");
      return;
    }

    const state = loadState();
    setLoadingRank(true);
    setError(null);
    try {
      const result = await rankCandidates(
        {
          resume_ids: uploadedCandidates.map((candidate) => candidate.resumeId),
          job_title: jobTitle,
          company,
          job_description: jobDescription,
          sort_by: sortBy,
        },
        state.authToken
      );
      setRanking(result.ranking);
    } catch (rankingError) {
      setError(rankingError instanceof Error ? rankingError.message : "Failed to rank candidates.");
    } finally {
      setLoadingRank(false);
    }
  }

  const filteredRanking = useMemo(() => {
    return ranking.filter((candidate) => {
      const scorePass = candidate.match_score * 100 >= minScore;
      const skillPass = !skillFilter.trim()
        || candidate.matched_skills.some((skill) => skill.toLowerCase().includes(skillFilter.toLowerCase()));
      return scorePass && skillPass;
    });
  }, [ranking, minScore, skillFilter]);

  return (
    <div className="space-y-6">
      <Card
        title="Recruiter Dashboard"
        description="Upload multiple resumes, rank candidates against a job description, and sort by fit, experience, or skill coverage."
      >
        <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-dashed border-slate-300 bg-mist/60 p-6">
              <label className="mb-2 block text-sm font-medium text-ink">Upload multiple resumes</label>
              <input type="file" accept=".pdf,.docx" multiple onChange={handleBulkUpload} />
              <p className="mt-2 text-xs text-slate">Each file is parsed and added to the candidate pool.</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-ink">Candidate pool</p>
              <div className="mt-3 space-y-3">
                {uploadedCandidates.length === 0 ? (
                  <p className="text-sm text-slate">No resumes uploaded yet.</p>
                ) : (
                  uploadedCandidates.map((candidate) => (
                    <div key={candidate.resumeId} className="rounded-2xl border border-slate-200 px-4 py-3">
                      <p className="text-sm font-medium text-ink">{candidate.name}</p>
                      <p className="text-xs text-slate">{candidate.filename}</p>
                      {candidate.headline ? <p className="mt-1 text-xs text-slate">{candidate.headline}</p> : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3"
              placeholder="Job title"
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
              className="min-h-64 rounded-3xl border border-slate-200 px-4 py-3 md:col-span-2"
              placeholder="Paste the full job description here..."
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
            />
            <select
              className="rounded-2xl border border-slate-200 px-4 py-3"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <div className="flex items-center justify-end">
              <button
                className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-white disabled:opacity-60"
                disabled={loadingUpload || loadingRank}
                onClick={handleRankCandidates}
                type="button"
              >
                {loadingUpload ? "Uploading..." : loadingRank ? "Ranking..." : "Rank candidates"}
              </button>
            </div>
          </div>
        </div>
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </Card>

      <Card title="Ranking Table" description="Filter and sort candidate results by the dimensions recruiters care about most.">
        <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm text-slate">
            Minimum match score
            <input
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={(event) => setMinScore(Number(event.target.value || 0))}
            />
          </label>
          <label className="text-sm text-slate">
            Required matched skill
            <input
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"
              placeholder="e.g. Python"
              value={skillFilter}
              onChange={(event) => setSkillFilter(event.target.value)}
            />
          </label>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
            <thead className="bg-mist/70">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-ink">Candidate</th>
                <th className="px-4 py-3 text-left font-semibold text-ink">Match</th>
                <th className="px-4 py-3 text-left font-semibold text-ink">Experience</th>
                <th className="px-4 py-3 text-left font-semibold text-ink">Skills Match</th>
                <th className="px-4 py-3 text-left font-semibold text-ink">Strengths</th>
                <th className="px-4 py-3 text-left font-semibold text-ink">Weaknesses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRanking.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate" colSpan={6}>No ranked candidates yet.</td>
                </tr>
              ) : (
                filteredRanking.map((candidate) => (
                  <tr key={candidate.resume_id} className="align-top">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-ink">{candidate.candidate_name || `Candidate ${candidate.resume_id}`}</p>
                      <p className="mt-1 text-xs text-slate">{candidate.headline || "No headline detected"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-ink">{Math.round(candidate.match_score * 100)}%</p>
                      <p className="mt-1 text-xs text-slate">Relevance {Math.round(candidate.relevance_score * 100)}%</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-ink">{candidate.experience_years_estimate.toFixed(1)} yrs</p>
                      <p className="mt-1 text-xs text-slate">Score {Math.round(candidate.experience_score * 100)}%</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-ink">{Math.round(candidate.skills_match_score * 100)}%</p>
                      <p className="mt-1 text-xs text-slate">
                        {candidate.matched_skills.slice(0, 4).join(", ") || "No matched skills"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <ul className="space-y-2 text-xs text-ink">
                        {candidate.strengths.map((strength) => (
                          <li key={strength}>{strength}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-4">
                      <ul className="space-y-2 text-xs text-slate">
                        {candidate.weaknesses.map((weakness) => (
                          <li key={weakness}>{weakness}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
