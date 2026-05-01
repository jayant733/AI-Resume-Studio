'use client';

import React, { useState, useEffect } from 'react';
import ExperienceEditor from '@/components/builder/ExperienceEditor';
import EducationEditor from '@/components/builder/EducationEditor';
import SummaryEditor from '@/components/builder/SummaryEditor';
import SkillsTagger from '@/components/builder/SkillsTagger';
import ProjectsEditor from '@/components/builder/ProjectsEditor';
import ResumePreview from '@/components/preview/ResumePreview';
import TemplateGrid from '@/components/templates/TemplateGrid';
import { useResumeStore } from '@/lib/store/resumeStore';
import { APP_STATE_KEY, loadState } from '@/lib/storage';
import { User } from '@/lib/types';
import { 
  Download, Save, Layout, Wand2, History, 
  ChevronLeft, ChevronRight, Mail, Phone, 
  MapPin, Globe, Linkedin, Loader2, Plus, 
  Trash2, Settings, User as UserIcon, Briefcase, 
  GraduationCap, List, FolderRoot, Sparkles
} from 'lucide-react';
import { createApplication, exportTemplatePdf } from '@/lib/api';
import { clsx } from 'clsx';

export default function BuilderPage() {
  const [activeTab, setActiveTab] = useState<'content' | 'templates' | 'sections'>('content');
  const { resumeData, templateId, setResumeData, saveResume, activeSections, toggleSection } = useResumeStore();
  const [user, setUser] = useState<User | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    const state = (loadState(APP_STATE_KEY) || {}) as any;
    setUser((state.currentUser as User) || null);
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const state = (loadState(APP_STATE_KEY) || {}) as any;
      const token = (state.authToken as string) || '';
      if (!token) throw new Error('Authentication required');

      const blob = await exportTemplatePdf({ resume_data: resumeData, template_id: templateId }, token);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${resumeData.name || 'resume'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaveStatus('saving');
    const resumeId = await saveResume(user.id);
    if (resumeId) {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('error');
    }
  };

  const SECTIONS = [
    { id: 'summary', label: 'Summary', icon: <List size={18} /> },
    { id: 'experience', label: 'Experience', icon: <Briefcase size={18} /> },
    { id: 'education', label: 'Education', icon: <GraduationCap size={18} /> },
    { id: 'skills', label: 'Skills', icon: <Wand2 size={18} /> },
    { id: 'projects', label: 'Projects', icon: <FolderRoot size={18} /> },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Top Navbar */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black italic shadow-lg shadow-blue-200">R</div>
          <div>
            <h1 className="text-sm font-black text-slate-900 leading-none tracking-tight">AI Resume Studio</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              Live Editing: {resumeData.name || 'New Resume'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleSave}
            disabled={saveStatus === 'saving' || !user}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-xs font-black uppercase tracking-widest border",
              saveStatus === 'saved' ? "bg-green-50 border-green-200 text-green-600" :
              saveStatus === 'error' ? "bg-red-50 border-red-200 text-red-600" :
              "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
            )}
          >
            {saveStatus === 'saving' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saveStatus === 'saved' ? 'Saved' : 'Save'}
          </button>
          
          <div className="w-px h-6 bg-slate-200" />
          
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-100 transition-all text-xs font-black uppercase tracking-widest disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Download PDF
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tab Navigation */}
        <aside className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-8 gap-8 shrink-0">
          <NavTab active={activeTab === 'content'} onClick={() => setActiveTab('content')} icon={<Wand2 size={24} />} label="Content" />
          <NavTab active={activeTab === 'templates'} onClick={() => setActiveTab('templates')} icon={<Layout size={24} />} label="Design" />
          <NavTab active={activeTab === 'sections'} onClick={() => setActiveTab('sections')} icon={<Settings size={24} />} label="Layout" />
        </aside>

        {/* Middle Panel - Editor */}
        <main className="flex-1 max-w-2xl bg-white border-r border-slate-200 overflow-y-auto custom-scrollbar">
          <div className="p-10 pb-32">
            {activeTab === 'content' ? (
              <div className="space-y-16">
                {/* Personal Details */}
                <section className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                       <div className="p-2 bg-slate-100 rounded-xl text-slate-500"><UserIcon size={20} /></div>
                       Personal Details
                    </h2>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <EditorInput label="Full Name" value={resumeData.name} onChange={v => setResumeData({ name: v })} placeholder="John Doe" />
                    <EditorInput label="Professional Headline" value={resumeData.headline} onChange={v => setResumeData({ headline: v })} placeholder="Software Engineer" />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <EditorInput label="Email Address" value={resumeData.contact.email} onChange={v => setResumeData({ contact: { ...resumeData.contact, email: v } })} placeholder="john@example.com" />
                    <EditorInput label="Phone Number" value={resumeData.contact.phone} onChange={v => setResumeData({ contact: { ...resumeData.contact, phone: v } })} placeholder="+1 234 567 890" />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <EditorInput label="Location" value={resumeData.contact.location} onChange={v => setResumeData({ contact: { ...resumeData.contact, location: v } })} placeholder="New York, NY" />
                    <EditorInput label="LinkedIn Profile" value={resumeData.contact.linkedin} onChange={v => setResumeData({ contact: { ...resumeData.contact, linkedin: v } })} placeholder="linkedin.com/in/johndoe" />
                  </div>
                </section>

                {/* Dynamic Content Sections */}
                {activeSections.includes('summary') && <SummaryEditor />}
                {activeSections.includes('experience') && <ExperienceEditor />}
                {activeSections.includes('projects') && <ProjectsEditor />}
                {activeSections.includes('education') && <EducationEditor />}
                {activeSections.includes('skills') && <SkillsTagger />}

                {activeSections.length < SECTIONS.length && (
                  <div className="pt-8 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Add missing sections</p>
                    <div className="flex flex-wrap gap-3">
                      {SECTIONS.filter(s => !activeSections.includes(s.id)).map(s => (
                        <button 
                          key={s.id}
                          onClick={() => toggleSection(s.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl border border-slate-200 hover:border-blue-200 text-xs font-bold transition-all"
                        >
                          <Plus size={14} /> {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === 'templates' ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Template Gallery</h2>
                  <p className="text-slate-500 font-medium">Choose a layout that matches your industry standards.</p>
                </div>
                <TemplateGrid />
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                 <div className="space-y-1">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Manage Sections</h2>
                  <p className="text-slate-500 font-medium">Customize which sections appear on your resume.</p>
                </div>
                <div className="grid gap-4">
                  {SECTIONS.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                       <div className="flex items-center gap-4">
                          <div className={clsx("p-3 rounded-2xl", activeSections.includes(s.id) ? "bg-blue-600 text-white" : "bg-white text-slate-400 border border-slate-200")}>
                            {s.icon}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{s.label}</p>
                            <p className="text-xs text-slate-500">{activeSections.includes(s.id) ? 'Visible on resume' : 'Hidden'}</p>
                          </div>
                       </div>
                       <button 
                         onClick={() => toggleSection(s.id)}
                         className={clsx(
                           "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border",
                           activeSections.includes(s.id) ? "bg-white border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-100" : "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                         )}
                       >
                         {activeSections.includes(s.id) ? 'Remove' : 'Add'}
                       </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right Panel - Live Preview */}
        <section className="flex-1 bg-slate-100 flex flex-col p-8 overflow-hidden relative">
          <div className="flex items-center justify-between mb-6 z-10">
             <div className="flex items-center gap-2">
               <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Real-time Sync Active</span>
             </div>
             <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-200">
                <button className="p-1 hover:bg-slate-50 rounded text-slate-400"><ChevronLeft size={16} /></button>
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-2">Page 1 of 1</span>
                <button className="p-1 hover:bg-slate-50 rounded text-slate-400"><ChevronRight size={16} /></button>
             </div>
          </div>
          
          <div className="flex-1 flex justify-center overflow-hidden">
             <div className="w-full max-w-[800px] h-full shadow-2xl shadow-slate-300 rounded-lg overflow-hidden bg-white">
               <ResumePreview />
             </div>
          </div>

          {/* AI Helper Bubble */}
          <div className="absolute bottom-8 right-8 animate-in fade-in slide-in-from-right-8 duration-700 delay-300">
             <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-xs border border-white/10">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/50">
                  <Sparkles size={18} />
                </div>
                <p className="text-xs font-medium text-slate-300 leading-relaxed">
                  I&apos;m analyzing your content. Click <span className="text-blue-400 font-bold">AI Improve</span> for suggestions.
                </p>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function NavTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={clsx(
        "p-3 rounded-2xl transition-all group flex flex-col items-center gap-1",
        active ? "bg-blue-50 text-blue-600 shadow-sm" : "text-slate-400 hover:bg-slate-50"
      )}
    >
      {icon}
      <span className={clsx("text-[9px] font-black uppercase tracking-widest", active ? "text-blue-600" : "text-slate-400")}>{label}</span>
    </button>
  );
}

function EditorInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <input 
        type="text" 
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-bold text-slate-900" 
        placeholder={placeholder}
      />
    </div>
  );
}
