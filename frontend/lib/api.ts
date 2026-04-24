import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// Standard production-grade axios instance
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'An unexpected error occurred';
    console.error(`[API Error] ${error.config.url}:`, message);
    return Promise.reject(new Error(message));
  }
);

export default api;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const signup = (payload: any) => api.post('/auth/signup', payload).then(res => res.data);
export const login = (payload: any) => api.post('/auth/login', payload).then(res => res.data);
export const logout = () => api.post('/auth/logout').then(res => res.data);
export const getMe = () => api.get('/auth/me').then(res => res.data);

// ---------------------------------------------------------------------------
// Resumes & Optimization
// ---------------------------------------------------------------------------
export const uploadResume = (formData: FormData) => 
  api.post('/upload-resume', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data);

export const analyzeJob = (payload: any) => api.post('/analyze-job', payload).then(res => res.data);

export const generateResume = (payload: any) => api.post('/generate-resume', payload).then(res => res.data);

export const getJobStatus = (jobId: number) => api.get(`/job-status/${jobId}`).then(res => res.data);

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------
export const listTemplates = () => api.get('/templates').then(res => res.data);
export const renderPreview = (payload: any) => api.post('/templates/render-preview', payload).then(res => res.data);
export const exportPdf = (payload: any) => 
  api.post('/templates/export', payload, { responseType: 'blob' }).then(res => res.data);

// ---------------------------------------------------------------------------
// Analytics & History
// ---------------------------------------------------------------------------
export const getOverview = () => api.get('/api/v1/analytics/overview').then(res => res.data);
export const getHistory = () => api.get('/api/v1/analytics/history').then(res => res.data);
export const getSkillsGap = () => api.get('/api/v1/analytics/skills-gap').then(res => res.data);

export const getAnalysis = (id: string) => api.get(`/api/v1/analysis/${id}`).then(res => res.data);
export const getEvaluation = (id: string) => api.get(`/api/v1/evaluation/${id}`).then(res => res.data);
export const getDiff = (id: string) => api.get(`/api/v1/diff/${id}`).then(res => res.data);

// ---------------------------------------------------------------------------
// CRM / Applications
// ---------------------------------------------------------------------------
export const listApplications = () => api.get('/api/v1/applications/').then(res => res.data);
export const updateApplication = (id: number, payload: any) => api.patch(`/api/v1/applications/${id}`, payload).then(res => res.data);
export const deleteApplication = (id: number) => api.delete(`/api/v1/applications/${id}`).then(res => res.data);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function resolvePdfUrl(path: string) {
  return `${API_BASE}${path}`;
}
