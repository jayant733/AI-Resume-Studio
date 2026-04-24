import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

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
  certifications?: string[];
  projects?: {
    name: string;
    description: string;
  }[];
}

interface ResumeState {
  resumeData: ResumeJSON;
  templateId: string;
  isSaving: boolean;
  
  // Actions
  setResumeData: (data: Partial<ResumeJSON>) => void;
  setTemplateId: (id: string) => void;
  updateExperience: (index: number, data: any) => void;
  addExperience: () => void;
  removeExperience: (index: number) => void;
  updateEducation: (index: number, data: any) => void;
  addEducation: () => void;
  removeEducation: (index: number) => void;
  saveResume: (userId: number) => Promise<number | null>;
}

const initialData: ResumeJSON = {
  name: '',
  headline: '',
  summary: '',
  contact: { email: '', phone: '', location: '' },
  skills: [],
  experience: [],
  education: [],
};

export const useResumeStore = create<ResumeState>()(
  persist(
    (set, get) => ({
      resumeData: initialData,
      templateId: 'classic',
      isSaving: false,

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

      saveResume: async (userId) => {
        set({ isSaving: true });
        try {
          const { resumeData } = get();
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/resumes/`,
            { user_id: userId, data: resumeData },
            { withCredentials: true }
          );
          return response.data.resume_id;
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
