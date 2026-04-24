"use client";

import React from 'react';
import { clsx } from 'clsx';
import { Info, CheckCircle2, ArrowRight, Zap, AlertCircle } from 'lucide-react';

type WordDiff =
  | { type: "same"; text: string }
  | { type: "added"; text: string }
  | { type: "removed"; text: string };

function diffWords(original: string, updated: string): WordDiff[] {
  const a = original.split(/\s+/).filter(Boolean);
  const b = updated.split(/\s+/).filter(Boolean);

  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: WordDiff[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: "same", text: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "added", text: b[j - 1] });
      j--;
    } else {
      result.unshift({ type: "removed", text: a[i - 1] });
      i--;
    }
  }
  return result;
}

function DiffLine({ original, optimized }: { original: string; optimized: string }) {
  const diffs = diffWords(original, optimized);
  return (
    <span className="text-sm leading-7">
      {diffs.map((d, i) =>
        d.type === "added" ? (
          <mark key={i} className="rounded bg-green-100 px-1 text-green-800 no-underline font-bold border-b-2 border-green-300">
            {d.text}{' '}
          </mark>
        ) : d.type === "removed" ? (
          <del key={i} className="rounded bg-red-50 px-1 text-red-400 line-through opacity-60">
            {d.text}{' '}
          </del>
        ) : (
          <span key={i} className="text-slate-600">{d.text}{' '}</span>
        )
      )}
    </span>
  );
}

export default function DiffViewer({ data }: { data: any }) {
  if (!data) return null;

  const { experience = [] } = data;

  return (
    <div className="space-y-10">
      {experience.map((exp: any, idx: number) => (
        <div key={idx} className="space-y-6">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-bold text-xs">
                {idx + 1}
              </div>
              <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">
                {exp.title} <span className="text-slate-300 mx-2">/</span> {exp.company}
              </h4>
           </div>

           <div className="grid gap-6">
              {exp.bullets?.map((bullet: any, bIdx: number) => (
                <div key={bIdx} className="bg-slate-50/50 rounded-3xl border border-slate-100 overflow-hidden group hover:border-blue-200 transition-all">
                   <div className="grid grid-cols-1 lg:grid-cols-2">
                      <div className="p-6 border-r border-slate-100 bg-white/40">
                         <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Original Input</span>
                         </div>
                         <p className="text-xs text-slate-400 leading-relaxed italic">{bullet.original}</p>
                      </div>
                      <div className="p-6 bg-white">
                         <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                               <Zap size={12} /> Strategic Optimization
                            </span>
                            {bullet.reason && (
                               <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Info size={10} /> {bullet.reason}
                               </div>
                            )}
                         </div>
                         <DiffLine original={bullet.original} optimized={bullet.optimized} />
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      ))}

      {experience.length === 0 && (
         <div className="py-20 text-center space-y-4 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
               <CheckCircle2 className="text-green-500" size={32} />
            </div>
            <div>
               <h4 className="text-lg font-bold text-slate-800">Content matches perfectly</h4>
               <p className="text-sm text-slate-400 font-medium">Your original bullets are already highly optimized for this role.</p>
            </div>
         </div>
      )}
    </div>
  );
}
