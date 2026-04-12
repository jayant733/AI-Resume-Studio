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

export type AppState = {
  upload?: UploadResponse;
  job?: JobAnalysis;
  generated?: GeneratedResume;
  draftJobTitle?: string;
  draftCompany?: string;
  draftDescription?: string;
};
