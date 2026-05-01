'use client';

import React, { useState } from 'react';
import { useResumeStore } from '@/lib/store/resumeStore';
import { X, Plus, Sparkles, Wand2 } from 'lucide-react';

export default function SkillsTagger() {
  const { resumeData, setResumeData } = useResumeStore();
  const [newSkill, setNewSkill] = useState('');

  const addSkill = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newSkill.trim() && !resumeData.skills.includes(newSkill.trim())) {
      setResumeData({ skills: [...resumeData.skills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setResumeData({ skills: resumeData.skills.filter(s => s !== skillToRemove) });
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between ml-1">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Key Skills</h2>
        <button className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">
          <Sparkles size={12} /> AI Extract
        </button>
      </div>

      <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 hover:border-blue-200 hover:bg-white transition-all shadow-sm">
        <div className="flex flex-wrap gap-2 mb-6">
          {resumeData.skills.map((skill, index) => (
            <div 
              key={index}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm hover:border-blue-300 transition-colors group"
            >
              {skill}
              <button 
                onClick={() => removeSkill(skill)}
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {resumeData.skills.length === 0 && (
            <p className="text-xs text-slate-400 font-medium italic py-2">No skills added yet. Add tags below or use AI to extract them.</p>
          )}
        </div>

        <form onSubmit={addSkill} className="flex gap-2">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            className="flex-1 px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
            placeholder="e.g. React.js, Python, Project Management..."
          />
          <button
            type="submit"
            className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition shadow-lg shadow-slate-200"
          >
            Add
          </button>
        </form>
        
        <div className="mt-6 flex items-center gap-2 pt-4 border-t border-slate-200/50">
           <Wand2 size={14} className="text-blue-600" />
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Group skills by categories (e.g. Languages, Tools) for better ATS parsing.</p>
        </div>
      </div>
    </section>
  );
}
