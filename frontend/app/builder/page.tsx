'use client';

import React, { useState } from 'react';
import ExperienceEditor from '@/components/builder/ExperienceEditor';
import SummaryEditor from '@/components/builder/SummaryEditor';
import SkillsTagger from '@/components/builder/SkillsTagger';
import ResumePreview from '@/components/preview/ResumePreview';
import TemplateGrid from '@/components/templates/TemplateGrid';
import { useResumeStore } from '@/lib/store/resumeStore';
import { Download, Save, Layout, Wand2, History, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';

export default function BuilderPage() {
  const [activeTab, setActiveTab] = useState<'content' | 'templates'>('content');
  const { resumeData, templateId } = useResumeStore();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/templates/export`,
        { resume_data: resumeData, template_id: templateId },
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'resume.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Top Navbar */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold italic shadow-lg shadow-blue-200">R</div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 leading-none">AI Resume Builder</h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">Drafting: {resumeData.name || 'Untitled'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all text-sm font-semibold">
            <History size={18} />
            Versions
          </button>
          <div className="w-px h-6 bg-slate-200" />
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md shadow-blue-100 transition-all text-sm font-bold disabled:opacity-50"
          >
            {isExporting ? <span className="animate-pulse">Exporting...</span> : (
              <>
                <Download size={18} />
                Download PDF
              </>
            )}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Navigation */}
        <aside className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-8 gap-8 shrink-0">
          <button 
            onClick={() => setActiveTab('content')}
            className={`p-3 rounded-2xl transition-all ${activeTab === 'content' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <Wand2 size={24} />
            <span className="text-[10px] font-bold block mt-1 uppercase">Build</span>
          </button>
          <button 
            onClick={() => setActiveTab('templates')}
            className={`p-3 rounded-2xl transition-all ${activeTab === 'templates' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <Layout size={24} />
            <span className="text-[10px] font-bold block mt-1 uppercase">Design</span>
          </button>
        </aside>

        {/* Middle Panel - Content Editor */}
        <main className="flex-1 max-w-2xl bg-white border-r border-slate-200 overflow-y-auto custom-scrollbar">
          <div className="p-10 space-y-12">
            {activeTab === 'content' ? (
              <>
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-800">Basic Information</h2>
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded tracking-widest uppercase">Step 1 of 4</span>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                      <input 
                        type="text" 
                        value={resumeData.name}
                        onChange={(e) => useResumeStore.getState().setResumeData({ name: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" 
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Professional Headline</label>
                      <input 
                        type="text" 
                        value={resumeData.headline}
                        onChange={(e) => useResumeStore.getState().setResumeData({ headline: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" 
                        placeholder="Senior Backend Developer"
                      />
                    </div>
                  </div>
                </section>

                <SummaryEditor />
                <ExperienceEditor />
                <SkillsTagger />
              </>
            ) : (
              <TemplateGrid />
            )}
          </div>
        </main>

        {/* Right Panel - Live Preview */}
        <section className="flex-1 bg-slate-100 flex flex-col p-8 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-2">
               <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
               <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Live Preview</span>
             </div>
             <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-200">
                <button className="p-1 hover:bg-slate-50 rounded text-slate-400"><ChevronLeft size={16} /></button>
                <span className="text-[10px] font-bold text-slate-600 uppercase">Page 1 of 1</span>
                <button className="p-1 hover:bg-slate-50 rounded text-slate-400"><ChevronRight size={16} /></button>
             </div>
          </div>
          
          <div className="flex-1 flex justify-center overflow-hidden">
             <div className="w-full max-w-[800px] h-full shadow-2xl shadow-slate-300">
               <ResumePreview />
             </div>
          </div>
        </section>
      </div>
    </div>
  );
}
