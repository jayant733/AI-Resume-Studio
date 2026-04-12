import { GeneratedResume, JobAnalysis, UploadResponse } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export async function uploadResume(formData: FormData): Promise<UploadResponse> {
  const response = await fetch(`${API_BASE}/upload-resume`, {
    method: "POST",
    body: formData
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function analyzeJob(payload: {
  resume_id: number;
  job_title?: string;
  company?: string;
  job_description: string;
}): Promise<JobAnalysis> {
  const response = await fetch(`${API_BASE}/analyze-job`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function generateResume(payload: {
  resume_id: number;
  job_id: number;
  tone: string;
  additional_context?: string;
}): Promise<GeneratedResume> {
  const response = await fetch(`${API_BASE}/generate-resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export function resolvePdfUrl(path: string) {
  return `${API_BASE}${path}`;
}
