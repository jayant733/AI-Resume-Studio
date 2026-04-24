'use client';

import React from 'react';
import { clsx } from 'clsx';
import { HelpCircle, Info } from 'lucide-react';

interface DiffItem {
  original: string;
  optimized: string;
  reason: string;
  added_keywords: string[];
}

export default function DiffViewer({ data }: { data: { experience: DiffItem[] } }) {
  if (!data || !data.experience) return null;

  return (
    <div className="space-y-8">
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3">
        <Info className="text-blue-500 shrink-0" size={20} />
        <p className="text-sm text-blue-700 leading-relaxed">
          Hover over the <span className="font-bold text-yellow-600">highlighted bullets</span> to see the strategic reasoning behind each AI improvement. 
          New keywords are marked in <span className="font-bold text-green-600">green</span>.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-8 font-semibold text-xs text-slate-400 uppercase tracking-widest px-2">
        <div>Original Content</div>
        <div>Optimized for ATS</div>
      </div>

      <div className="space-y-6">
        {data.experience.map((item, idx) => (
          <div key={idx} className="grid grid-cols-2 gap-8 items-start group">
            {/* Original Bullet */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 line-through decoration-slate-300 opacity-70 italic text-sm">
              {item.original}
            </div>

            {/* Optimized Bullet with Tooltip logic */}
            <div className="relative p-4 bg-white border border-blue-100 rounded-xl shadow-sm hover:shadow-md transition-all cursor-help group/bullet">
              <p className="text-sm text-slate-800 leading-relaxed">
                {/* Simplified Keyword Highlighting for Demo */}
                {item.optimized.split(' ').map((word, i) => {
                  const cleanWord = word.replace(/[.,]/g, '');
                  const isKeyword = item.added_keywords.some(k => k.toLowerCase() === cleanWord.toLowerCase());
                  return (
                    <span key={i} className={clsx(isKeyword && "text-green-600 font-bold")}>
                      {word}{' '}
                    </span>
                  );
                })}
              </p>

              {/* Custom Tooltip */}
              <div className="absolute top-full left-0 mt-2 z-20 w-72 p-4 bg-slate-900 text-white text-xs rounded-xl shadow-2xl opacity-0 invisible group-hover/bullet:opacity-100 group-hover/bullet:visible transition-all">
                 <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold uppercase tracking-tighter">
                   <HelpCircle size={14} />
                   <span>AI Reasoning</span>
                 </div>
                 <p className="leading-normal mb-3 text-slate-300">{item.reason}</p>
                 {item.added_keywords.length > 0 && (
                   <div className="pt-2 border-t border-slate-700">
                     <span className="block text-[10px] text-slate-500 mb-1 font-bold uppercase">Keywords Inserted:</span>
                     <div className="flex flex-wrap gap-1">
                       {item.added_keywords.map(kw => (
                         <span key={kw} className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30 font-medium">{kw}</span>
                       ))}
                     </div>
                   </div>
                 )}
                 <div className="absolute -top-1 left-6 w-3 h-3 bg-slate-900 rotate-45" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
