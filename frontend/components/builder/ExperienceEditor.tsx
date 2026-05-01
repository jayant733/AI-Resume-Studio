'use client';

import React, { useState } from 'react';
import { useResumeStore } from '@/lib/store/resumeStore';
import { Plus, Trash2, Zap, GripVertical, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { improveText } from '@/lib/api';
import { APP_STATE_KEY, loadState } from '@/lib/storage';
import { clsx } from 'clsx';

export default function ExperienceEditor() {
  const { resumeData, updateExperience, addExperience, removeExperience } = useResumeStore();
  const [improvingIndex, setImprovingIndex] = useState<number | null>(null);

  const handleAIImprove = async (index: number) => {
    const exp = resumeData.experience[index];
    const textToImprove = exp.bullets.join('\n');
    if (!textToImprove.trim()) return;

    setImprovingIndex(index);
    try {
      const state = (loadState(APP_STATE_KEY) || {}) as any;
      const { improved } = await improveText({
        text: textToImprove,
        context: `Resume experience section for ${exp.title} at ${exp.company}`
      }, state.authToken);
      
      const newBullets = improved.split('\n').filter(b => b.trim() !== '').map(b => b.replace(/^[•\-\*\s]+/, ''));
      updateExperience(index, { bullets: newBullets });
    } catch (err) {
      console.error('AI improvement failed:', err);
    } finally {
      setImprovingIndex(null);
    }
  };

  const handleBulletChange = (expIndex: number, bulletIndex: number, val: string) => {
    const newBullets = [...resumeData.experience[expIndex].bullets];
    newBullets[bulletIndex] = val;
    updateExperience(expIndex, { bullets: newBullets });
  };

  const addBullet = (expIndex: number) => {
    const newBullets = [...resumeData.experience[expIndex].bullets, ''];
    updateExperience(expIndex, { bullets: newBullets });
  };

  const removeBullet = (expIndex: number, bulletIndex: number) => {
    const newBullets = resumeData.experience[expIndex].bullets.filter((_, i) => i !== bulletIndex);
    updateExperience(expIndex, { bullets: newBullets });
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Experience</h2>
        <button 
          onClick={addExperience}
          className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition"
        >
          <Plus size={16} /> Add Position
        </button>
      </div>

      <div className="space-y-8">
        {resumeData.experience.map((exp, index) => (
          <div key={index} className="group relative bg-slate-50 rounded-[2rem] p-8 border border-slate-100 hover:border-blue-200 hover:bg-white transition-all shadow-sm hover:shadow-xl">
             <button 
               onClick={() => removeExperience(index)}
               className="absolute -top-3 -right-3 p-2 bg-white text-slate-400 hover:text-red-500 rounded-full border border-slate-100 shadow-md opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100"
             >
               <Trash2 size={18} />
             </button>

             <div className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Job Title</label>
                    <input 
                      type="text" 
                      value={exp.title}
                      onChange={(e) => updateExperience(index, { title: e.target.value })}
                      className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold" 
                      placeholder="e.g. Senior Product Designer"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company</label>
                    <input 
                      type="text" 
                      value={exp.company}
                      onChange={(e) => updateExperience(index, { company: e.target.value })}
                      className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold" 
                      placeholder="e.g. Stripe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                    <input 
                      type="text" 
                      value={exp.start_date}
                      onChange={(e) => updateExperience(index, { start_date: e.target.value })}
                      className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                      placeholder="Jan 2020"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                    <input 
                      type="text" 
                      value={exp.end_date}
                      onChange={(e) => updateExperience(index, { end_date: e.target.value })}
                      className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                      placeholder="Present"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Achievements & Impact</label>
                    <button 
                      onClick={() => handleAIImprove(index)}
                      disabled={improvingIndex === index}
                      className="flex items-center gap-1 text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline disabled:opacity-50"
                    >
                      {improvingIndex === index ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />} 
                      AI Improve All
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {exp.bullets.map((bullet, bIndex) => (
                      <div key={bIndex} className="group/bullet relative">
                        <textarea 
                          value={bullet}
                          onChange={(e) => handleBulletChange(index, bIndex, e.target.value)}
                          className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm min-h-[80px] pr-12" 
                          placeholder="Describe a key achievement or responsibility..."
                        />
                        <button 
                          onClick={() => removeBullet(index, bIndex)}
                          className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover/bullet:opacity-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => addBullet(index)}
                      className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-blue-600 transition ml-1"
                    >
                      <Plus size={14} /> Add Bullet Point
                    </button>
                  </div>
                </div>
             </div>
          </div>
        ))}

        {resumeData.experience.length === 0 && (
          <div className="py-12 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-center px-10">
             <div className="p-4 bg-slate-50 rounded-2xl mb-4"><GripVertical className="text-slate-300" size={32} /></div>
             <p className="text-sm font-bold text-slate-900 mb-1">No experience listed yet</p>
             <p className="text-xs text-slate-400 font-medium max-w-[200px] mb-6">Start by adding your most recent role to show your professional growth.</p>
             <button 
               onClick={addExperience}
               className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition shadow-lg shadow-slate-200"
             >
               Add First Position
             </button>
          </div>
        )}
      </div>
    </section>
  );
}
