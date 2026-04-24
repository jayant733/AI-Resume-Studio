'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import DiffViewer from '@/components/analysis/DiffViewer';
import { 
  BarChart3, 
  Target, 
  Zap, 
  FileCheck, 
  ArrowUpRight, 
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function AnalysisPage() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState<any>(null);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [diff, setDiff] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [aRes, eRes, dRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/analysis/${id}`),
          axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/evaluation/${id}`),
          axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/diff/${id}`)
        ]);
        setAnalysis(aRes.data);
        setEvaluation(eRes.data);
        setDiff(dRes.data);
      } catch (err) {
        console.error('Failed to load analysis data:', err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-10">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header Section */}
        <div className="flex items-end justify-between">
          <div className="space-y-2">
             <h1 className="text-4xl font-black text-slate-900 tracking-tight">Optimization Report</h1>
             <p className="text-slate-500 font-medium">Deep dive into your resume's strategic improvements and ATS performance.</p>
          </div>
          <div className="bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-100 flex items-center gap-2 font-bold animate-bounce">
             <Zap size={18} />
             ATS Score +{evaluation.ats_score_improvement}%
          </div>
        </div>

        {/* Score Cards Grid */}
        <div className="grid grid-cols-4 gap-6">
           <ScoreCard 
             title="Overall Match" 
             score={evaluation.overall_score_after} 
             prevScore={evaluation.overall_score_before}
             icon={<Target className="text-blue-500" />} 
           />
           <ScoreCard 
             title="Skill Alignment" 
             score={analysis.breakdown.keyword_match * 100} 
             icon={<Zap className="text-yellow-500" />} 
           />
           <ScoreCard 
             title="Experience Fit" 
             score={analysis.breakdown.experience_alignment * 100} 
             icon={<BarChart3 className="text-purple-500" />} 
           />
           <ScoreCard 
             title="Format Quality" 
             score={analysis.breakdown.formatting_score * 100} 
             icon={<FileCheck className="text-green-500" />} 
           />
        </div>

        {/* Detailed Panels */}
        <div className="grid grid-cols-3 gap-8">
           {/* Improvement Breakdown */}
           <div className="col-span-2 bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50 space-y-8">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <ArrowUpRight className="text-blue-600" />
                Strategic Content Improvements
              </h3>
              <DiffViewer data={diff} />
           </div>

           {/* Skills Gap Analysis */}
           <div className="space-y-6">
             <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <AlertCircle className="text-red-500" />
                  Missing Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.missing_keywords.map((skill: string) => (
                    <span key={skill} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100 uppercase tracking-tighter">
                      {skill}
                    </span>
                  ))}
                  {analysis.missing_keywords.length === 0 && (
                    <p className="text-sm text-green-600 font-medium">Perfect! You matched all target skills.</p>
                  )}
                </div>
             </div>

             <div className="bg-blue-600 rounded-3xl p-8 text-white shadow-xl shadow-blue-200">
                <h3 className="text-lg font-bold mb-2">Pro Tip</h3>
                <p className="text-blue-100 text-sm leading-relaxed">
                  Your "Experience Fit" score improved significantly because the AI translated your responsibilities into 
                  measurable outcomes that match the seniority of this role.
                </p>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}

function ScoreCard({ title, score, prevScore, icon }: { title: string, score: number, prevScore?: number, icon: any }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg shadow-slate-100 space-y-4">
      <div className="flex items-center justify-between">
        <div className="p-2 bg-slate-50 rounded-xl">{icon}</div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
      </div>
      <div>
        <div className="text-3xl font-black text-slate-900">{Math.round(score)}%</div>
        <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
          <div 
            className="bg-blue-600 h-full transition-all duration-1000" 
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
      {prevScore && (
        <p className="text-[10px] font-bold text-slate-500">
          Was <span className="line-through">{Math.round(prevScore)}%</span> before optimization
        </p>
      )}
    </div>
  );
}
