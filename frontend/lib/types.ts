export type ContactInfo = {
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin?: string | null;
  website?: string | null;
};

export type ExperienceEntry = {
  title: string;
  company?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  bullets: string[];
};

export type EducationEntry = {
  institution: string;
  degree?: string | null;
  graduation_date?: string | null;
};

export type ParsedResume = {
  name?: string | null;
  headline?: string | null;
  contact: ContactInfo;
  summary?: string | null;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  certifications: string[];
  projects: Array<Record<string, unknown>>;
};

export type UploadResponse = {
  resume_id: number;
  parsed_resume: ParsedResume;
  image_caption?: string | null;
};

export type User = {
  id: number;
  email: string;
  full_name?: string | null;
  subscription_tier: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: "bearer";
  user: User;
};

export type JobAnalysis = {
  job_id: number;
  semantic_score: number;
  matched_skills: string[];
  missing_skills: string[];
  relevant_experience: Array<{ fragment: string; distance: number }>;
  recommendations: string[];
};

export type GeneratedResume = {
  output_id: number;
  optimized_resume: Record<string, unknown>;
  pdf_download_url: string;
};

// Async job tracking
export type GenerateJobResponse = {
  job_id: number;
};

export type JobStatusResponse = {
  job_id: number;
  status: "queued" | "processing" | "done" | "failed";
  error?: string | null;
  result?: GeneratedResume | null;
};

// ATS Scoring
export type ATSScoreDimension = {
  score: number;
  label: string;
  detail: string;
};

export type ATSScoreResponse = {
  total_score: number;
  keyword_density: ATSScoreDimension;
  action_verb_rate: ATSScoreDimension;
  quantification_rate: ATSScoreDimension;
  section_completeness: ATSScoreDimension;
  improvement_tips: string[];
};

// Cover Letter
export type CoverLetterResponse = {
  cover_letter_text: string;
  pdf_download_url: string;
};

// Scraper
export type ScrapeJobResponse = {
  title: string | null;
  company: string | null;
  description: string;
  parsed: Record<string, unknown>;
};

// Diff view
export type DiffResponse = {
  original: Record<string, unknown>;
  optimized: Record<string, unknown>;
};

export type InterviewQuestionsResponse = {
  technical_questions: string[];
  behavioral_questions: string[];
  project_questions: string[];
};

export type CandidateRankingItem = {
  resume_id: number;
  candidate_name?: string | null;
  headline?: string | null;
  match_score: number;
  strengths: string[];
  weaknesses: string[];
  matched_skills: string[];
  missing_skills: string[];
  relevance_score: number;
  experience_score: number;
  skills_match_score: number;
  experience_years_estimate: number;
};

export type CandidateRankingResponse = {
  ranking: CandidateRankingItem[];
};

export type AppState = {
  authToken?: string;
  currentUser?: User;
  upload?: UploadResponse;
  job?: JobAnalysis;
  generated?: GeneratedResume;
  draftJobTitle?: string;
  draftCompany?: string;
  draftDescription?: string;
};
