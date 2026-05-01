'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  getAnalyticsHistory,
  getAnalyticsOverview,
  getAnalyticsSkillsGap,
  getLatestEvaluation,
} from '@/lib/api';
import { APP_STATE_KEY, loadState } from '@/lib/storage';
import { 
  Award, BarChart3, CheckCircle2, ChevronRight, FileText, 
  Layers, MessageSquare, Plus, Target, TrendingUp, Zap, Loader2 
} from 'lucide-react';
import { clsx } from 'clsx';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type OverviewStats = {
  total_resumes?: number;
  total_optimizations?: number;
  avg_improvement?: number;
  avg_ats_score?: number;
  last_output_id?: number | null;
  last_ats_score?: number | null;
  total_applications?: number;
  interview_rate?: number;
  profile_strength?: string;
  credits_remaining?: number;
  tier?: string;
  status?: string;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [skillsGap, setSkillsGap] = useState<any[]>([]);
  const [latestEval, setLatestEval] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const searchParams = useSearchParams();
  const isSuccess = searchParams.get('success') === 'true';

  const token = useMemo(() => {
    const state = (loadState(APP_STATE_KEY) || {}) as any;
    return (state.authToken as string) || '';
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');

      if (!token) {
        setError('Please log in to view your dashboard.');
        setLoading(false);
        return;
      }

      try {
        const [overviewRes, historyRes, gapRes, latestEvalRes] = await Promise.all([
          getAnalyticsOverview(token).catch(() => null),
          getAnalyticsHistory(token).catch(() => null),
          getAnalyticsSkillsGap(token).catch(() => null),
          getLatestEvaluation(token).catch(() => null),
        ]);

        if (overviewRes) {
          const data = overviewRes.stats || null;
          setStats(data);
          
          if (data?.tier) {
            const state = (loadState(APP_STATE_KEY) || {}) as any;
            if (state.currentUser) {
              state.currentUser.subscription_tier = data.tier;
              localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
            }
          }
        }
        if (historyRes) setHistory(historyRes || []);
        if (gapRes) setSkillsGap(gapRes || []);
        if (latestEvalRes) setLatestEval(latestEvalRes || null);
      } catch (e: any) {
        setError(e?.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [token]);

  const hasResumes = (stats?.total_resumes || 0) > 0;

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Success Banner */}
      {isSuccess && (
        <div className="bg-blue-600 text-white p-6 rounded-[2.5rem] shadow-xl flex items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="p-3 bg-white/20 rounded-2xl">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h3 className="text-xl font-black">Subscription Unlocked!</h3>
            <p className="text-white/80 font-medium">Your account has been upgraded. Enjoy unlimited optimizations and premium features.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Overview</h1>
          <p className="text-slate-500 font-medium">Monitor your career progress and ATS performance.</p>
        </div>
        <Link 
          href="/upload" 
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition"
        >
          <Plus size={18} />
          New Resume
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Dynamic Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="ATS Score"
          value={`${Math.round((stats?.last_ats_score ?? stats?.avg_ats_score ?? 0) as number)}%`}
          trend={stats?.avg_improvement ? `+${stats.avg_improvement}%` : undefined}
          sub="Last optimization"
          icon={<Target className="text-blue-600" size={20} />}
        />
        <StatCard
          label="Optimizations"
          value={`${stats?.total_optimizations ?? 0}`}
          sub="Total AI improvements"
          icon={<Zap className="text-amber-500" size={20} />}
        />
        <StatCard
          label="Interview Rate"
          value={`${Math.round((stats?.interview_rate ?? 0) as number)}%`}
          sub="Tracked applications"
          icon={<TrendingUp className="text-emerald-500" size={20} />}
        />
        <StatCard
          label="Profile Strength"
          value={stats?.profile_strength || '—'}
          sub="Market competitiveness"
          icon={<Award className="text-indigo-500" size={20} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Real-time Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <BarChart3 className="text-blue-600" size={20} />
              Performance Timeline
            </h3>
          </div>

          {!hasResumes || history.length === 0 ? (
            <div className="h-[320px] flex flex-col items-center justify-center rounded-3xl bg-slate-50 border border-dashed border-slate-200 p-10 text-center">
              <div className="p-4 bg-white rounded-2xl shadow-sm mb-4">
                <Layers className="text-slate-300" size={32} />
              </div>
              <p className="text-sm font-bold text-slate-900 mb-1">No performance data yet</p>
              <p className="text-xs text-slate-400 font-medium max-w-[200px]">Generate an optimized resume to see your score progression.</p>
            </div>
          ) : (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} 
                    domain={[0, 100]} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score_after"
                    stroke="#2563eb"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorScore)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Next Actions */}
        <div className="space-y-8">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-lg font-black mb-6">Next Actions</h3>
              <div className="space-y-4">
                <ActionLink 
                  href="/suggestions" 
                  icon={<Zap size={18} />} 
                  label="Improve Resume" 
                  sub="AI-powered suggestions"
                />
                <ActionLink 
                  href="/job" 
                  icon={<Target size={18} />} 
                  label="Match with Job" 
                  sub="Calculate ATS alignment"
                />
                <ActionLink 
                  href="/tools" 
                  icon={<MessageSquare size={18} />} 
                  label="Interview Prep" 
                  sub="Generate questions"
                />
              </div>
            </div>
            <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700">
              <Zap size={160} />
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-6">Skill Gaps</h3>
            {skillsGap.length === 0 ? (
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center py-4">
                No gaps detected
              </p>
            ) : (
              <div className="space-y-2">
                {skillsGap.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-700">{item.skill}</span>
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">High Priority</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, trend, sub, icon }: { label: string; value: string; trend?: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4 transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="p-3 bg-slate-50 rounded-2xl">{icon}</div>
        {trend && (
          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{label}</p>
        <div className="text-3xl font-black text-slate-900">{value}</div>
        <p className="text-[10px] font-bold text-slate-400 mt-1">{sub}</p>
      </div>
    </div>
  );
}

function ActionLink({ href, icon, label, sub }: { href: string; icon: React.ReactNode; label: string; sub: string }) {
  return (
    <Link 
      href={href} 
      className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition group"
    >
      <div className="flex items-center gap-3">
        <div className="text-blue-400">{icon}</div>
        <div>
          <p className="text-sm font-bold text-white">{label}</p>
          <p className="text-[10px] font-medium text-white/50">{sub}</p>
        </div>
      </div>
      <ChevronRight size={16} className="text-white/20 group-hover:translate-x-1 transition-transform" />
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-pulse">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-200 rounded-xl" />
          <div className="h-4 w-64 bg-slate-200 rounded-lg" />
        </div>
        <div className="h-12 w-32 bg-slate-200 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-white rounded-[2rem] border border-slate-200" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 h-[400px] bg-white rounded-[2.5rem] border border-slate-200" />
        <div className="h-[400px] bg-white rounded-[2.5rem] border border-slate-200" />
      </div>
    </div>
  );
}
