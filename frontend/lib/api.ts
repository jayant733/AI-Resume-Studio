import {
  ATSScoreResponse,
  CoverLetterResponse,
  DiffResponse,
  InterviewQuestionsResponse,
  JobAnalysis,
  JobStatusResponse,
  ScrapeJobResponse,
  UploadResponse,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function createHeaders(token?: string, json = true): HeadersInit {
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function parseJsonOrText(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...rest } = options;
  const bodyLog = rest.body instanceof FormData ? "[FormData]" : (rest.body ? JSON.parse(rest.body as string) : "");
  const fullUrl = `${API_BASE}${path}`;
  console.log(`🚀 Fetching: ${rest.method || 'GET'} ${fullUrl}`, bodyLog);
  
  try {
    const response = await fetch(fullUrl, {
      ...rest,
      headers: { ...(rest.headers || {}), ...createHeaders(token, !(rest.body instanceof FormData)) },
    });

    if (!response.ok) {
      const payload = await parseJsonOrText(response);
      const detail = typeof payload === "object" && payload && "detail" in payload ? (payload as any).detail : payload;
      
      // Use warn for 4xx to avoid Next.js dev overlay for expected empty states
      if (response.status >= 400 && response.status < 500) {
        console.warn(`⚠️ Request failed: ${path} (Status: ${response.status})`, payload);
      } else {
        console.error(`❌ Request failed: ${path} (Status: ${response.status})`, payload);
      }
      
      throw new Error(detail || response.statusText);
    }

    const data = await response.json();
    console.log(`✅ Request success: ${path}`, data);
    return data as T;
  } catch (err: any) {
    // Only log actual network failures, don't double-log HTTP errors we threw above
    if (err instanceof TypeError && err.message === "Failed to fetch") {
      console.error(`🔥 Network error: ${path}`, err);
      console.error("DEBUG: This might be a CORS error or the backend might be down.");
      console.error(`DEBUG: Attempted URL: ${fullUrl}`);
    }
    throw err;
  }
}

async function requestText(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<string> {
  const { token, ...rest } = options;
  console.log(`🚀 Fetching Text: ${rest.method || 'GET'} ${path}`);
  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: { ...(rest.headers || {}), ...createHeaders(token, !(rest.body instanceof FormData)) },
  });
  if (!response.ok) {
    const payload = await parseJsonOrText(response);
    const detail = typeof payload === "object" && payload && "detail" in payload ? (payload as any).detail : payload;
    if (response.status >= 400 && response.status < 500) {
      console.warn(`⚠️ Request failed: ${path} (Status: ${response.status})`, payload);
    } else {
      console.error(`❌ Request failed: ${path} (Status: ${response.status})`, payload);
    }
    throw new Error(detail || response.statusText);
  }
  return await response.text();
}

async function requestBlob(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<Blob> {
  const { token, ...rest } = options;
  console.log(`🚀 Fetching Blob: ${rest.method || 'GET'} ${path}`);
  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: { ...(rest.headers || {}), ...createHeaders(token, !(rest.body instanceof FormData)) },
  });
  if (!response.ok) {
    const payload = await parseJsonOrText(response);
    const detail = typeof payload === "object" && payload && "detail" in payload ? (payload as any).detail : payload;
    if (response.status >= 400 && response.status < 500) {
      console.warn(`⚠️ Request failed: ${path} (Status: ${response.status})`, payload);
    } else {
      console.error(`❌ Request failed: ${path} (Status: ${response.status})`, payload);
    }
    throw new Error(detail || response.statusText);
  }
  return await response.blob();
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export async function signup(payload: { full_name: string; email: string; password: string }) {
  return request<any>("/auth/signup", { method: "POST", body: JSON.stringify(payload) });
}

export async function login(payload: { email: string; password: string }) {
  return request<any>("/auth/login", { method: "POST", body: JSON.stringify(payload) });
}

export async function getMe(token: string) {
  return request<any>("/auth/me", { token });
}

// ---------------------------------------------------------------------------
// Upload / Parse
// ---------------------------------------------------------------------------
export async function uploadResume(formData: FormData, token?: string): Promise<UploadResponse> {
  return request<UploadResponse>("/upload-resume", { method: "POST", body: formData, token });
}

// ---------------------------------------------------------------------------
// Job analysis / scrape
// ---------------------------------------------------------------------------
export async function analyzeJob(payload: {
  resume_id: number;
  job_title?: string;
  company?: string;
  job_description: string;
}, token?: string): Promise<JobAnalysis> {
  return request<JobAnalysis>("/analyze-job", { method: "POST", body: JSON.stringify(payload), token });
}

export async function scrapeJob(url: string): Promise<ScrapeJobResponse> {
  return request<ScrapeJobResponse>("/scrape-job", { method: "POST", body: JSON.stringify({ url }) });
}

// ---------------------------------------------------------------------------
// Resume generation (async)
// ---------------------------------------------------------------------------
export async function generateResume(payload: {
  resume_id: number;
  job_id: number;
  tone: string;
  additional_context?: string;
  template_id?: string;
}, token?: string): Promise<{ job_id: number }> {
  return request<{ job_id: number }>("/generate-resume", { method: "POST", body: JSON.stringify(payload), token });
}

export async function getJobStatus(jobId: number): Promise<JobStatusResponse> {
  return request<JobStatusResponse>(`/job-status/${jobId}`, { method: "GET" });
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------
export async function getDiff(outputId: number): Promise<DiffResponse> {
  return request<DiffResponse>(`/diff/${outputId}`, { method: "GET" });
}

export async function getATSScore(outputId: number): Promise<ATSScoreResponse> {
  return request<ATSScoreResponse>(`/ats-score?output_id=${outputId}`, { method: "GET" });
}

export async function generateCoverLetter(payload: {
  resume_id: number;
  job_id: number;
  tone?: string;
}): Promise<CoverLetterResponse> {
  return request<CoverLetterResponse>("/generate-cover-letter", { method: "POST", body: JSON.stringify(payload) });
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------
export async function generateLinkedinProfile(payload: { resume_id: number }, token?: string) {
  return request<{ headline?: string; about?: string }>("/products/linkedin-optimize", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function generateInterviewQuestions(
  payload: {
    resume_id?: number;
    resume_text?: string;
    job_title?: string;
    company?: string;
    job_description: string;
  },
  token?: string
): Promise<InterviewQuestionsResponse> {
  return request<InterviewQuestionsResponse>("/generate-interview-questions", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function improveText(payload: { text: string; context?: string }, token?: string) {
  return request<{ improved: string }>("/ai/improve", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export function resolvePdfUrl(path: string) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------
export async function listTemplates(token: string) {
  return request<any[]>("/templates", { token, method: "GET" });
}

export async function renderTemplatePreview(
  payload: { template_id: string; resume_data: any },
  token: string
) {
  return request<{ html: string }>("/templates/render-preview", { token, method: "POST", body: JSON.stringify(payload) });
}

export async function exportTemplatePdf(
  payload: { template_id: string; resume_data: any },
  token: string
) {
  return requestBlob("/templates/export", { token, method: "POST", body: JSON.stringify(payload) });
}

// ---------------------------------------------------------------------------
// Analytics / Dashboard (v1)
// ---------------------------------------------------------------------------
export async function getAnalyticsOverview(token: string) {
  return request<any>("/api/v1/analytics/overview", { token, method: "GET" });
}

export async function getAnalyticsHistory(token: string) {
  return request<any[]>("/api/v1/analytics/history", { token, method: "GET" });
}

export async function getAnalyticsSkillsGap(token: string) {
  return request<any[]>("/api/v1/analytics/skills-gap", { token, method: "GET" });
}

export async function getLatestAnalysis(token: string) {
  return request<any>("/api/v1/analysis", { token, method: "GET" });
}

export async function getLatestEvaluation(token: string) {
  return request<any>("/api/v1/evaluation", { token, method: "GET" });
}

export async function getOutputAnalysis(outputId: number, token: string) {
  return request<any>(`/api/v1/analysis/${outputId}`, { token, method: "GET" });
}

export async function getOutputEvaluation(outputId: number, token: string) {
  return request<any>(`/api/v1/evaluation/${outputId}`, { token, method: "GET" });
}

export async function getOutputDiff(outputId: number, token: string) {
  return request<any>(`/api/v1/diff/${outputId}`, { token, method: "GET" });
}

// ---------------------------------------------------------------------------
// Resumes (builder / recruiter helpers)
// ---------------------------------------------------------------------------
export async function listResumes(token: string) {
  return request<any[]>("/api/v1/resumes/", { token, method: "GET" });
}

export async function recruiterRankCandidates(
  payload: { resume_ids: number[]; job_description: string; sort_by?: string },
  token: string
) {
  return request<any>("/api/v1/recruiter/rank-candidates", { token, method: "POST", body: JSON.stringify(payload) });
}

// ---------------------------------------------------------------------------
// Stripe
// ---------------------------------------------------------------------------
export async function getStripePrices() {
  return request<any>("/stripe/prices", { method: "GET" });
}

export async function createCheckoutSession(params: { price_id?: string; target_tier?: string; email?: string }, token?: string) {
  const search = new URLSearchParams();
  if (params.price_id) search.set("price_id", params.price_id);
  if (params.target_tier) search.set("target_tier", params.target_tier);
  if (params.email) search.set("email", params.email);
  const qs = search.toString();
  return request<{ url: string }>(`/stripe/create-checkout-session${qs ? `?${qs}` : ""}`, {
    method: "POST",
    token,
  });
}

// ---------------------------------------------------------------------------
// Applications (job tracker)
// ---------------------------------------------------------------------------
export async function listApplications(token: string) {
  return request<any[]>("/api/v1/applications/", { token, method: "GET" });
}

export async function createApplication(payload: { company: string; job_title: string; job_url?: string; output_id?: number; status?: string }, token: string) {
  return request<any>("/api/v1/applications/", { token, method: "POST", body: JSON.stringify(payload) });
}

export async function updateApplication(appId: number, payload: { status?: string; notes?: string }, token: string) {
  return request<any>(`/api/v1/applications/${appId}`, { token, method: "PATCH", body: JSON.stringify(payload) });
}

export async function deleteApplication(appId: number, token: string) {
  return request<any>(`/api/v1/applications/${appId}`, { token, method: "DELETE" });
}
