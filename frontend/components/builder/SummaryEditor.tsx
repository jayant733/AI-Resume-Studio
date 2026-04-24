'use client';

import React from 'react';
import { useResumeStore } from '@/lib/store/resumeStore';

export default function SummaryEditor() {
  const { resumeData, setResumeData } = useResumeStore();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">Professional Summary</h3>
      <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
        <textarea
          value={resumeData.summary}
          onChange={(e) => setResumeData({ summary: e.target.value })}
          className="w-full h-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm resize-none"
          placeholder="Write a brief overview of your career and key strengths..."
        />
      </div>
    </div>
  );
}
