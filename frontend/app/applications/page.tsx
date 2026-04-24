'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Briefcase, 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  ExternalLink,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  LayoutGrid,
  List as ListIcon,
  Loader2
} from 'lucide-react';
import { clsx } from 'clsx';

const STAGES = [
  { id: 'applied', label: 'Applied', color: 'bg-blue-500' },
  { id: 'interview', label: 'Interview', color: 'bg-purple-500' },
  { id: 'rejected', label: 'Rejected', color: 'bg-red-500' },
  { id: 'offer', label: 'Offer', color: 'bg-green-500' },
];

export default function ApplicationsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [view, setView] = useState<'table' | 'kanban'>('kanban');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/applications/`, { withCredentials: true });
      setApps(response.data);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (appId: number, status: string) => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/applications/${appId}`, { status }, { withCredentials: true });
      setApps(apps.map(a => a.id === appId ? { ...a, status } : a));
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const deleteApp = async (appId: number) => {
    if (!confirm('Are you sure you want to delete this application?')) return;
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/applications/${appId}`, { withCredentials: true });
      setApps(apps.filter(a => a.id !== appId));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8 space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between">
         <div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Application Tracker</h1>
           <p className="text-slate-500 font-medium">Manage your job search pipeline and track your success.</p>
         </div>
         
         <div className="flex items-center gap-4">
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
               <button 
                 onClick={() => setView('list')} 
                 className={clsx("p-2 rounded-lg transition-all", view === 'list' ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600")}
               >
                 <ListIcon size={18} />
               </button>
               <button 
                 onClick={() => setView('kanban')} 
                 className={clsx("p-2 rounded-lg transition-all", view === 'kanban' ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600")}
               >
                 <LayoutGrid size={18} />
               </button>
            </div>
            <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all">
               <Plus size={18} /> New Application
            </button>
         </div>
      </div>

      {view === 'kanban' ? (
        <div className="grid grid-cols-4 gap-6 h-[calc(100vh-250px)]">
           {STAGES.map((stage) => (
             <div key={stage.id} className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                   <div className="flex items-center gap-2">
                      <div className={clsx("w-2 h-2 rounded-full", stage.color)}></div>
                      <h3 className="font-bold text-slate-700 uppercase tracking-widest text-xs">{stage.label}</h3>
                      <span className="text-[10px] font-black text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">
                        {apps.filter(a => a.status === stage.id).length}
                      </span>
                   </div>
                </div>

                <div className="flex-1 bg-slate-200/50 rounded-[2rem] p-4 space-y-4 overflow-y-auto border border-dashed border-slate-300">
                   {apps.filter(a => a.status === stage.id).map((app) => (
                     <KanbanCard key={app.id} app={app} onStatusChange={updateStatus} onDelete={deleteApp} />
                   ))}
                </div>
             </div>
           ))}
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
           <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                 <tr>
                    <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Company & Role</th>
                    <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">ATS Score</th>
                    <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Applied On</th>
                    <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest"></th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {apps.map((app) => (
                   <tr key={app.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-6">
                         <div className="font-bold text-slate-900">{app.company}</div>
                         <div className="text-sm text-slate-500 font-medium">{app.job_title}</div>
                      </td>
                      <td className="px-8 py-6">
                         <StatusBadge status={app.status} />
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-2">
                            <div className="text-sm font-black text-blue-600">{app.ats_score ? `${app.ats_score}%` : 'N/A'}</div>
                            {app.ats_score && (
                              <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                 <div className="bg-blue-600 h-full" style={{ width: `${app.ats_score}%` }} />
                              </div>
                            )}
                         </div>
                      </td>
                      <td className="px-8 py-6 text-sm text-slate-400 font-medium">
                         {new Date(app.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-6 text-right">
                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => deleteApp(app.id)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg"><Trash2 size={18} /></button>
                            {app.job_url && <a href={app.job_url} target="_blank" className="p-2 text-slate-300 hover:text-blue-500 rounded-lg"><ExternalLink size={18} /></a>}
                         </div>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}
    </div>
  );
}

function KanbanCard({ app, onStatusChange, onDelete }: { app: any, onStatusChange: any, onDelete: any }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all group">
       <div className="flex justify-between items-start mb-3">
          <div>
             <h4 className="font-bold text-slate-900 line-clamp-1">{app.company}</h4>
             <p className="text-xs text-slate-500 font-medium line-clamp-1">{app.job_title}</p>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
             <button onClick={() => onDelete(app.id)} className="p-1 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
          </div>
       </div>

       <div className="flex items-center justify-between pt-4 border-t border-slate-50">
          <div className="flex items-center gap-1.5">
             <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                ATS: {app.ats_score ? `${app.ats_score}%` : '--'}
             </div>
          </div>
          <select 
            value={app.status}
            onChange={(e) => onStatusChange(app.id, e.target.value)}
            className="text-[10px] font-bold text-slate-400 bg-transparent outline-none cursor-pointer hover:text-slate-600"
          >
             {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
       </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: any = {
    applied: { icon: <Clock size={12} />, label: 'Applied', color: 'text-blue-600 bg-blue-50 border-blue-100' },
    interview: { icon: <Zap size={12} />, label: 'Interview', color: 'text-purple-600 bg-purple-50 border-purple-100' },
    rejected: { icon: <XCircle size={12} />, label: 'Rejected', color: 'text-red-600 bg-red-50 border-red-100' },
    offer: { icon: <CheckCircle2 size={12} />, label: 'Offer', color: 'text-green-600 bg-green-50 border-green-100' },
  };
  const c = config[status] || config.applied;
  return (
    <div className={clsx("flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", c.color)}>
       {c.icon} {c.label}
    </div>
  );
}
