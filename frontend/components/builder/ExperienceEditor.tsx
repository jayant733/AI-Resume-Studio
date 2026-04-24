'use client';

import React from 'react';
import { useResumeStore } from '@/lib/store/resumeStore';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';

export default function ExperienceEditor() {
  const { resumeData, updateExperience, addExperience, removeExperience } = useResumeStore();

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Experience</h3>
        <button
          onClick={addExperience}
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          <Plus size={16} /> Add Position
        </button>
      </div>

      {resumeData.experience.map((exp, index) => (
        <div key={index} className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="grid grid-cols-2 gap-4 flex-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Job Title</label>
                <input
                  type="text"
                  value={exp.title}
                  onChange={(e) => updateExperience(index, { title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. Senior Software Engineer"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</label>
                <input
                  type="text"
                  value={exp.company}
                  onChange={(e) => updateExperience(index, { company: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. Google"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Start Date</label>
                <input
                  type="text"
                  value={exp.start_date}
                  onChange={(e) => updateExperience(index, { start_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="MM/YYYY"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">End Date</label>
                <input
                  type="text"
                  value={exp.end_date}
                  onChange={(e) => updateExperience(index, { end_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Present"
                />
              </div>
            </div>
            <button
              onClick={() => removeExperience(index)}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Achievements & Responsibilities</label>
            {exp.bullets.map((bullet, bIndex) => (
              <div key={bIndex} className="flex gap-2">
                <input
                  type="text"
                  value={bullet}
                  onChange={(e) => handleBulletChange(index, bIndex, e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                  placeholder="Describe your impact..."
                />
                <button
                  onClick={() => removeBullet(index, bIndex)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={() => addBullet(index)}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              + Add Bullet Point
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
