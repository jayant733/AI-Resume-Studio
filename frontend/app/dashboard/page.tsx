'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  Target, 
  Zap, 
  Award, 
  AlertCircle, 
  ChevronRight,
  Loader2,
  Trophy,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { clsx } from 'clsx';

export default function DashboardPage() {
  const [overview, setOverview] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [skillsGap, setSkillsGap] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [oRes, hRes, sRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/analytics/overview`, { withCredentials: true }),
          axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/analytics/history`, { withCredentials: true }),
          axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/analytics/skills-gap`, { withCredentials: true })
        ]);
        setOverview(oRes.data);
        setHistory(hRes.data);
        setSkillsGap(sRes.data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Assembling Insights...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8 space-y-10">
      
      {/* Header */}
      <div className="flex items-end justify-between">
         <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight italic">Performance Hub</h1>
            <p className="text-slate-500 font-medium">Track your career progression and resume effectiveness.</p>
         </div>
         <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Updates Enabled</span>
         </div>
      </div>

      {/* Top Level Stats */}
      <div className="grid grid-cols-4 gap-6">
         <StatCard 
           label="Average ATS Score" 
           value={`${Math.round(overview?.avg_ats_score || 0)}%`} 
           sub="Across all versions"
           icon={<Trophy className="text-yellow-500" />}
           color="border-yellow-200"
         />
         <StatCard 
           label="Optimizations" 
           value={overview?.total_optimizations || 0} 
           sub="AI-powered enhancements"
           icon={<Zap className="text-blue-500" />}
           color="border-blue-200"
         />
         <StatCard 
           label="Interview Rate" 
           value="12%" 
           sub="+4% from last month"
           icon={<Activity className="text-green-500" />}
           color="border-green-200"
         />
         <StatCard 
           label="Profile Strength" 
           value="Expert" 
           sub="Top 5% of applicants"
           icon={<Award className="text-purple-500" />}
           color="border-purple-200"
         />
      </div>

      <div className="grid grid-cols-3 gap-8">
         {/* Charts Section */}
         <div className="col-span-2 space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="text-blue-600" />
                    Score Progression
                  </h3>
                  <select className="bg-slate-50 border-none text-xs font-bold text-slate-500 rounded-lg px-3 py-1 outline-none">
                    <option>Last 30 Days</option>
                    <option>Last 90 Days</option>
                  </select>
               </div>
               <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                        dy={10}
                      />
                      <YAxis 
                        hide 
                        domain={[0, 100]}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#2563eb" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorScore)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
               <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-lg">
                  <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Target size={18} className="text-orange-500" />
                    Focus Areas
                  </h4>
                  <ul className="space-y-4">
                     <FocusItem label="Technical Depth" progress={85} />
                     <FocusItem label="Leadership Narrative" progress={62} />
                     <FocusItem label="Impact Quantification" progress={45} />
                  </ul>
               </div>
               <div className="bg-blue-600 p-8 rounded-[2rem] text-white shadow-xl shadow-blue-200 relative overflow-hidden group">
                  <div className="relative z-10 space-y-4">
                    <h4 className="text-xl font-bold leading-tight">Your next level is just 5 edits away.</h4>
                    <p className="text-blue-100 text-sm">Focus on adding specific metrics to your latest role to boost your score by 15%.</p>
                    <button className="flex items-center gap-2 bg-white text-blue-600 px-6 py-2 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors">
                      Optimize Now <ChevronRight size={16} />
                    </button>
                  </div>
                  <Zap className="absolute -bottom-6 -right-6 w-32 h-32 text-blue-500 opacity-20 group-hover:scale-110 transition-transform duration-700" />
               </div>
            </div>
         </div>

         {/* Side Panel */}
         <div className="space-y-8">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50">
               <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                 <AlertCircle className="text-red-500" />
                 Critical Skill Gaps
               </h3>
               <p className="text-xs text-slate-400 font-medium mb-6 leading-relaxed">
                 Based on your last 10 job applications, these skills were most frequently missing:
               </p>
               <div className="space-y-3">
                  {skillsGap.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors group cursor-default">
                       <span className="text-sm font-bold text-slate-700">{item.skill}</span>
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Frequency</span>
                          <span className="text-xs font-black text-blue-600">{item.count}x</span>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-lg space-y-6">
               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                 <Award className="text-green-500" />
                 Top Performing Resumes
               </h3>
               <div className="space-y-4">
                  {[1, 2].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group">
                       <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                          <Target size={20} />
                       </div>
                       <div className="flex-1">
                          <p className="text-sm font-bold text-slate-800">Senior Dev - Google</p>
                          <p className="text-xs text-slate-400 font-medium">94% ATS Match</p>
                       </div>
                       <ArrowUpRight size={16} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, color }: any) {
  return (
    <div className={clsx("bg-white p-6 rounded-3xl border-b-4 shadow-lg shadow-slate-100 space-y-4 transition-transform hover:-translate-y-1 cursor-default", color)}>
       <div className="flex items-center justify-between">
          <div className="p-2 bg-slate-50 rounded-xl">{icon}</div>
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{label}</span>
       </div>
       <div>
          <div className="text-3xl font-black text-slate-900">{value}</div>
          <p className="text-[10px] font-bold text-slate-400 mt-1">{sub}</p>
       </div>
    </div>
  );
}

function FocusItem({ label, progress }: any) {
  return (
    <div className="space-y-2">
       <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-600">{label}</span>
          <span className="text-[10px] font-black text-slate-400">{progress}%</span>
       </div>
       <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-blue-600 h-full rounded-full transition-all duration-1000" 
            style={{ width: `${progress}%` }} 
          />
       </div>
    </div>
  );
}
