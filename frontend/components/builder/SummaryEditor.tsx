'use client';

import React, { useState } from 'react';
import { useResumeStore } from '@/lib/store/resumeStore';
import { Sparkles, Zap, Loader2 } from 'lucide-react';
import { improveText } from '@/lib/api';
import { APP_STATE_KEY, loadState } from '@/lib/storage';

export default function SummaryEditor() {
  const { resumeData, setResumeData } = useResumeStore();
  const [improving, setImproving] = useState(false);

  const handleAIImprove = async () => {
    if (!resumeData.summary.trim()) return;
    setImproving(true);
    try {
      const state = (loadState(APP_STATE_KEY) || {}) as any;
      const { improved } = await improveText({
        text: resumeData.summary,
        context: `Professional summary for ${resumeData.headline}`
      }, state.authToken);
      setResumeData({ summary: improved });
    } catch (err) {
      console.error('AI improvement failed:', err);
    } finally {
      setImproving(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between ml-1">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Professional Summary</h2>
        <button 
          onClick={handleAIImprove}
          disabled={improving}
          className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline disabled:opacity-50"
        >
          {improving ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} 
          AI Generate
        </button>
      </div>

      <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 hover:border-blue-200 hover:bg-white transition-all shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20">
        <textarea
          value={resumeData.summary}
          onChange={(e) => setResumeData({ summary: e.target.value })}
          className="w-full h-48 bg-transparent border-none outline-none text-sm font-medium text-slate-700 leading-relaxed resize-none"
          placeholder="Write a compelling summary of your professional background, key strengths, and career goals..."
        />
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200/50">
           <Sparkles size={14} className="text-blue-600" />
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Keep it under 3-4 sentences for best results.</p>
        </div>
      </div>
    </section>
  );
}
