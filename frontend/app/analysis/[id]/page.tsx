'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import DiffViewer from '@/components/analysis/DiffViewer';
import { BarChart3, Target, Zap, FileCheck, ArrowUpRight, AlertCircle, Loader2 } from 'lucide-react';
import { APP_STATE_KEY, loadState } from '@/lib/storage';
import { getOutputAnalysis, getOutputDiff, getOutputEvaluation } from '@/lib/api';

export default function AnalysisPage() {
  const { id } = useParams();
  const outputId = Number(id);

  const [analysis, setAnalysis] = useState<any>(null);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [diff, setDiff] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = useMemo(() => {
    const state = (loadState(APP_STATE_KEY) || {}) as any;
    return (state.authToken as string) || '';
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        if (!token) throw new Error('Authentication required');
        if (!Number.isFinite(outputId)) throw new Error('Invalid output id');

        const [aRes, eRes, dRes] = await Promise.all([
          getOutputAnalysis(outputId, token),
          getOutputEvaluation(outputId, token),
          getOutputDiff(outputId, token),
        ]);
        setAnalysis(aRes);
        setEvaluation(eRes);
        setDiff(dRes);
      } catch (err: any) {
        console.error('Failed to load analysis data:', err);
        setError(err?.message || 'Failed to load analysis data.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id, outputId, token]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-10">
        <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
          <p className="text-sm font-black text-slate-900">Report unavailable</p>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const breakdown = analysis?.breakdown || {};
  const keywordScore = Math.round(((breakdown.keyword_match?.score ?? 0) as number) * 100);
  const experienceScore = Math.round(((breakdown.experience_alignment?.score ?? 0) as number) * 100);
  const formattingScore = Math.round(((breakdown.formatting_score?.score ?? 0) as number) * 100);
  const missingKeywords: string[] = analysis?.metrics?.missing_keywords || [];

  return (
    <div className="min-h-screen bg-slate-50 p-10">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Optimization report</h1>
            <p className="text-slate-500 font-medium">Breakdown of ATS score and content improvements.</p>
          </div>
          {evaluation?.ats_score_improvement != null ? (
            <div className="bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-100 flex items-center gap-2 font-bold">
              <Zap size={18} />
              +{evaluation.ats_score_improvement} pts
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <ScoreCard
            title="Overall match"
            score={evaluation?.overall_score_after ?? 0}
            prevScore={evaluation?.overall_score_before}
            icon={<Target className="text-blue-500" />}
          />
          <ScoreCard title="Skill alignment" score={keywordScore} icon={<Zap className="text-yellow-500" />} />
          <ScoreCard title="Experience fit" score={experienceScore} icon={<BarChart3 className="text-purple-500" />} />
          <ScoreCard title="Format quality" score={formattingScore} icon={<FileCheck className="text-green-500" />} />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <ArrowUpRight className="text-blue-600" />
              Content improvements
            </h3>
            <DiffViewer data={diff} />
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <AlertCircle className="text-red-500" />
                Missing skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {missingKeywords.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-bold border border-red-100 uppercase tracking-tighter"
                  >
                    {skill}
                  </span>
                ))}
                {missingKeywords.length === 0 ? (
                  <p className="text-sm text-green-600 font-medium">Nice — no obvious missing keywords detected.</p>
                ) : null}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Next action</p>
              <p className="mt-2 text-sm font-bold text-slate-900">Add 2–3 impact metrics</p>
              <p className="mt-2 text-sm text-slate-500">
                Add numbers (%, $, time saved, scale) to your strongest bullets to raise ATS and recruiter clarity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({
  title,
  score,
  prevScore,
  icon,
}: {
  title: string;
  score: number;
  prevScore?: number;
  icon: any;
}) {
  const normalized = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="p-2 bg-slate-50 rounded-xl">{icon}</div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
      </div>
      <div>
        <div className="text-3xl font-black text-slate-900">{Math.round(normalized)}%</div>
        <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
          <div className="bg-blue-600 h-full transition-all duration-700" style={{ width: `${normalized}%` }} />
        </div>
      </div>
      {typeof prevScore === 'number' ? (
        <p className="text-[10px] font-bold text-slate-500">
          Was <span className="line-through">{Math.round(prevScore)}%</span> before optimization
        </p>
      ) : null}
    </div>
  );
}

