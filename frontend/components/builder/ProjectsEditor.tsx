'use client';

import React, { useState } from 'react';
import { useResumeStore } from '@/lib/store/resumeStore';
import { Plus, Trash2, Layout, Zap, GripVertical, Loader2 } from 'lucide-react';
import { improveText } from '@/lib/api';
import { APP_STATE_KEY, loadState } from '@/lib/storage';

export default function ProjectsEditor() {
  const { resumeData, updateProject, addProject, removeProject } = useResumeStore();
  const [improvingIndex, setImprovingIndex] = useState<number | null>(null);

  const handleAIImprove = async (index: number) => {
    const proj = resumeData.projects[index];
    if (!proj.description.trim()) return;

    setImprovingIndex(index);
    try {
      const state = (loadState(APP_STATE_KEY) || {}) as any;
      const { improved_text } = await improveText({
        text: proj.description,
        context: `Resume project section for ${proj.name}`
      }, state.authToken);
      
      updateProject(index, { description: improved_text });
    } catch (err) {
      console.error('AI improvement failed:', err);
    } finally {
      setImprovingIndex(null);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Projects</h2>
        <button 
          onClick={addProject}
          className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition"
        >
          <Plus size={16} /> Add Project
        </button>
      </div>

      <div className="space-y-8">
        {resumeData.projects.map((project, index) => (
          <div key={index} className="group relative bg-slate-50 rounded-[2rem] p-8 border border-slate-100 hover:border-blue-200 hover:bg-white transition-all shadow-sm hover:shadow-xl">
             <button 
               onClick={() => removeProject(index)}
               className="absolute -top-3 -right-3 p-2 bg-white text-slate-400 hover:text-red-500 rounded-full border border-slate-100 shadow-md opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100"
             >
               <Trash2 size={18} />
             </button>

             <div className="grid gap-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Name</label>
                    <input 
                      type="text" 
                      value={project.name}
                      onChange={(e) => updateProject(index, { name: e.target.value })}
                      className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold" 
                      placeholder="e.g. AI Portfolio Platform"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                    <button 
                      onClick={() => handleAIImprove(index)}
                      disabled={improvingIndex === index}
                      className="flex items-center gap-1 text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline disabled:opacity-50"
                    >
                      {improvingIndex === index ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
                      AI Improve
                    </button>
                  </div>
                  <textarea 
                    value={project.description}
                    onChange={(e) => updateProject(index, { description: e.target.value })}
                    className="w-full h-32 px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm leading-relaxed" 
                    placeholder="Describe your role, technology used, and the impact of this project..."
                  />
                </div>
             </div>
          </div>
        ))}

        {resumeData.projects.length === 0 && (
          <div className="py-12 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-center px-10">
             <div className="p-4 bg-slate-50 rounded-2xl mb-4"><Layout className="text-slate-300" size={32} /></div>
             <p className="text-sm font-bold text-slate-900 mb-1">Highlight your best work</p>
             <p className="text-xs text-slate-400 font-medium max-w-[200px] mb-6">Adding personal or professional projects is a great way to showcase technical skills.</p>
             <button 
               onClick={addProject}
               className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition shadow-lg shadow-slate-200"
             >
               Add First Project
             </button>
          </div>
        )}
      </div>
    </section>
  );
}
