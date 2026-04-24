'use client';

import React, { useState } from 'react';
import { useResumeStore } from '@/lib/store/resumeStore';
import { X, Plus } from 'lucide-react';

export default function SkillsTagger() {
  const { resumeData, setResumeData } = useResumeStore();
  const [inputValue, setInputValue] = useState('');

  const addSkill = () => {
    if (inputValue.trim() && !resumeData.skills.includes(inputValue.trim())) {
      setResumeData({ skills: [...resumeData.skills, inputValue.trim()] });
      setInputValue('');
    }
  };

  const removeSkill = (skill: string) => {
    setResumeData({ skills: resumeData.skills.filter((s) => s !== skill) });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">Skills</h3>
      <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
            placeholder="Add a skill (e.g. React, Python, Project Management)..."
          />
          <button
            onClick={addSkill}
            className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {resumeData.skills.map((skill, index) => (
            <span
              key={index}
              className="flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium border border-slate-200 group hover:bg-slate-200 transition-all"
            >
              {skill}
              <button
                onClick={() => removeSkill(skill)}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <X size={14} />
              </button>
            </span>
          ))}
          {resumeData.skills.length === 0 && (
            <p className="text-sm text-slate-400 italic">No skills added yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
