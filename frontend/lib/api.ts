import {
  ATSScoreResponse,
  CoverLetterResponse,
  DiffResponse,
  GeneratedResume,
  GenerateJobResponse,
  JobAnalysis,
  JobStatusResponse,
  ScrapeJobResponse,
  UploadResponse,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------
export async function uploadResume(formData: FormData): Promise<UploadResponse> {
  const response = await fetch(`${API_BASE}/upload-resume`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

// ---------------------------------------------------------------------------
// Job analysis
// ---------------------------------------------------------------------------
export async function analyzeJob(payload: {
  resume_id: number;
  job_title?: string;
  company?: string;
  job_description: string;
}): Promise<JobAnalysis> {
  const response = await fetch(`${API_BASE}/analyze-job`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

// ---------------------------------------------------------------------------
// Scrape job URL
// ---------------------------------------------------------------------------
export async function scrapeJob(url: string): Promise<ScrapeJobResponse> {
  const response = await fetch(`${API_BASE}/scrape-job`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

// ---------------------------------------------------------------------------
// Generate resume (async — returns job_id)
// ---------------------------------------------------------------------------
export async function generateResume(payload: {
  resume_id: number;
  job_id: number;
  tone: string;
  additional_context?: string;
  template_id?: string;
}): Promise<GenerateJobResponse> {
  const response = await fetch(`${API_BASE}/generate-resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

// ---------------------------------------------------------------------------
// Poll job status
// ---------------------------------------------------------------------------
export async function getJobStatus(jobId: number): Promise<JobStatusResponse> {
  const response = await fetch(`${API_BASE}/job-status/${jobId}`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

// ---------------------------------------------------------------------------
// Stream generate (SSE)
// ---------------------------------------------------------------------------
export async function* streamGenerateResume(payload: {
  resume_id: number;
  job_id: number;
  tone: string;
  additional_context?: string;
  template_id?: string;
}): AsyncGenerator<string> {
  const response = await fetch(`${API_BASE}/stream-generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok || !response.body) throw new Error(await response.text());

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.chunk) yield parsed.chunk as string;
        if (parsed.error) throw new Error(parsed.error as string);
      } catch {
        // skip malformed SSE lines
      }
    }
  }
}

// ---------------------------------------------------------------------------
// ATS Score
// ---------------------------------------------------------------------------
export async function getATSScore(outputId: number): Promise<ATSScoreResponse> {
  const response = await fetch(`${API_BASE}/ats-score?output_id=${outputId}`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

// ---------------------------------------------------------------------------
// Diff view
// ---------------------------------------------------------------------------
export async function getDiff(outputId: number): Promise<DiffResponse> {
  const response = await fetch(`${API_BASE}/diff/${outputId}`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

// ---------------------------------------------------------------------------
// Cover letter
// ---------------------------------------------------------------------------
export async function generateCoverLetter(payload: {
  resume_id: number;
  job_id: number;
  tone?: string;
}): Promise<CoverLetterResponse> {
  const response = await fetch(`${API_BASE}/generate-cover-letter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function resolvePdfUrl(path: string) {
  return `${API_BASE}${path}`;
}
