'use client';

import React from 'react';
import { useResumeStore } from '@/lib/store/resumeStore';
import { Plus, Trash2, GraduationCap } from 'lucide-react';

export default function EducationEditor() {
  const { resumeData, updateEducation, addEducation, removeEducation } = useResumeStore();

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Education</h2>
        <button 
          onClick={addEducation}
          className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition"
        >
          <Plus size={16} /> Add School
        </button>
      </div>

      <div className="space-y-8">
        {resumeData.education.map((edu, index) => (
          <div key={index} className="group relative bg-slate-50 rounded-[2rem] p-8 border border-slate-100 hover:border-blue-200 hover:bg-white transition-all shadow-sm hover:shadow-xl">
             <button 
               onClick={() => removeEducation(index)}
               className="absolute -top-3 -right-3 p-2 bg-white text-slate-400 hover:text-red-500 rounded-full border border-slate-100 shadow-md opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100"
             >
               <Trash2 size={18} />
             </button>

             <div className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Institution</label>
                    <input 
                      type="text" 
                      value={edu.institution}
                      onChange={(e) => updateEducation(index, { institution: e.target.value })}
                      className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold" 
                      placeholder="e.g. Stanford University"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Degree / Field of Study</label>
                    <input 
                      type="text" 
                      value={edu.degree}
                      onChange={(e) => updateEducation(index, { degree: e.target.value })}
                      className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold" 
                      placeholder="e.g. B.S. Computer Science"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Graduation Date</label>
                    <input 
                      type="text" 
                      value={edu.graduation_date}
                      onChange={(e) => updateEducation(index, { graduation_date: e.target.value })}
                      className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                      placeholder="May 2021"
                    />
                  </div>
                </div>
             </div>
          </div>
        ))}

        {resumeData.education.length === 0 && (
          <div className="py-12 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-center px-10">
             <div className="p-4 bg-slate-50 rounded-2xl mb-4"><GraduationCap className="text-slate-300" size={32} /></div>
             <p className="text-sm font-bold text-slate-900 mb-1">Add your academic background</p>
             <p className="text-xs text-slate-400 font-medium max-w-[200px] mb-6">List your degrees to help recruiters understand your educational foundation.</p>
             <button 
               onClick={addEducation}
               className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition shadow-lg shadow-slate-200"
             >
               Add Education
             </button>
          </div>
        )}
      </div>
    </section>
  );
}
