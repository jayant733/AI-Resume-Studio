import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { APP_STATE_KEY, loadState } from '@/lib/storage';

export interface ResumeJSON {
  name: string;
  headline: string;
  summary: string;
  contact: {
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    website?: string;
  };
  skills: string[];
  experience: {
    title: string;
    company: string;
    start_date: string;
    end_date: string;
    bullets: string[];
  }[];
  education: {
    institution: string;
    degree: string;
    graduation_date: string;
  }[];
  certifications: string[];
  projects: {
    name: string;
    description: string;
  }[];
}

interface ResumeState {
  resumeData: ResumeJSON;
  templateId: string;
  isSaving: boolean;
  manualResumeId: number | null;
  activeSections: string[];
  
  // Actions
  setResumeData: (data: Partial<ResumeJSON>) => void;
  setTemplateId: (id: string) => void;
  updateExperience: (index: number, data: any) => void;
  addExperience: () => void;
  removeExperience: (index: number) => void;
  updateEducation: (index: number, data: any) => void;
  addEducation: () => void;
  removeEducation: (index: number) => void;
  updateProject: (index: number, data: any) => void;
  addProject: () => void;
  removeProject: (index: number) => void;
  toggleSection: (section: string) => void;
  saveResume: (userId: number) => Promise<number | null>;
}

const initialData: ResumeJSON = {
  name: '',
  headline: '',
  summary: '',
  contact: { 
    email: '', 
    phone: '', 
    location: '',
    linkedin: ''
  },
  skills: [],
  experience: [],
  education: [],
  certifications: [],
  projects: [],
};

export const useResumeStore = create<ResumeState>()(
  persist(
    (set, get) => ({
      resumeData: initialData,
      templateId: 'classic',
      isSaving: false,
      manualResumeId: null,
      activeSections: ['summary', 'experience', 'education', 'skills'],

      setResumeData: (data) => 
        set((state) => ({ resumeData: { ...state.resumeData, ...data } })),

      setTemplateId: (id) => set({ templateId: id }),

      updateExperience: (index, data) => 
        set((state) => {
          const newExp = [...state.resumeData.experience];
          newExp[index] = { ...newExp[index], ...data };
          return { resumeData: { ...state.resumeData, experience: newExp } };
        }),

      addExperience: () => 
        set((state) => ({
          resumeData: {
            ...state.resumeData,
            experience: [
              ...state.resumeData.experience,
              { title: '', company: '', start_date: '', end_date: '', bullets: [''] }
            ]
          }
        })),

      removeExperience: (index) => 
        set((state) => ({
          resumeData: {
            ...state.resumeData,
            experience: state.resumeData.experience.filter((_, i) => i !== index)
          }
        })),

      updateEducation: (index, data) => 
        set((state) => {
          const newEdu = [...state.resumeData.education];
          newEdu[index] = { ...newEdu[index], ...data };
          return { resumeData: { ...state.resumeData, education: newEdu } };
        }),

      addEducation: () => 
        set((state) => ({
          resumeData: {
            ...state.resumeData,
            education: [
              ...state.resumeData.education,
              { institution: '', degree: '', graduation_date: '' }
            ]
          }
        })),

      removeEducation: (index) => 
        set((state) => ({
          resumeData: {
            ...state.resumeData,
            education: state.resumeData.education.filter((_, i) => i !== index)
          }
        })),

      updateProject: (index, data) => 
        set((state) => {
          const newProj = [...state.resumeData.projects];
          newProj[index] = { ...newProj[index], ...data };
          return { resumeData: { ...state.resumeData, projects: newProj } };
        }),

      addProject: () => 
        set((state) => ({
          resumeData: {
            ...state.resumeData,
            projects: [
              ...state.resumeData.projects,
              { name: '', description: '' }
            ]
          }
        })),

      removeProject: (index) => 
        set((state) => ({
          resumeData: {
            ...state.resumeData,
            projects: state.resumeData.projects.filter((_, i) => i !== index)
          }
        })),

      toggleSection: (section) => 
        set((state) => ({
          activeSections: state.activeSections.includes(section)
            ? state.activeSections.filter(s => s !== section)
            : [...state.activeSections, section]
        })),

      saveResume: async (userId) => {
        set({ isSaving: true });
        try {
          const { resumeData, manualResumeId } = get();
          const state = (loadState(APP_STATE_KEY) || {}) as any;
          const token = (state.authToken as string) || '';
          if (!token) throw new Error('Authentication required');

          const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
          const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

          if (!manualResumeId) {
            const res = await fetch(`${API_BASE}/api/v1/resumes/`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ data: resumeData }),
            });
            if (!res.ok) throw new Error(await res.text());
            const payload = await res.json();
            const newId = payload?.resume_id as number | undefined;
            if (newId) set({ manualResumeId: newId });
            return newId || null;
          }

          const res = await fetch(`${API_BASE}/api/v1/resumes/${manualResumeId}/versions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ version_name: 'Manual Edit', data: resumeData }),
          });
          if (!res.ok) throw new Error(await res.text());
          return manualResumeId;
        } catch (err) {
          console.error('Failed to save resume:', err);
          return null;
        } finally {
          set({ isSaving: false });
        }
      },
    }),
    {
      name: 'resume-draft-storage',
    }
  )
);
