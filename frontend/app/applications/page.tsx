'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Briefcase, 
  Search, 
  Filter, 
  Plus, 
  ExternalLink,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  Zap,
  MoreVertical,
  Calendar,
  ChevronRight,
  X,
  FileText,
  StickyNote,
  MapPin,
  Save
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { APP_STATE_KEY, loadState } from '@/lib/storage';
import { deleteApplication, listApplications, updateApplication } from '@/lib/api';

const STAGES = [
  { id: 'applied', label: 'Applied', color: 'bg-blue-500', border: 'border-blue-200' },
  { id: 'review', label: 'Review', color: 'bg-orange-500', border: 'border-orange-200' },
  { id: 'interview', label: 'Interview', color: 'bg-purple-500', border: 'border-purple-200' },
  { id: 'offer', label: 'Offer', color: 'bg-green-500', border: 'border-green-200' },
  { id: 'rejected', label: 'Rejected', color: 'bg-red-500', border: 'border-red-200' },
];

export default function ApplicationsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [view, setView] = useState<'table' | 'kanban'>('kanban');
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const state = (loadState(APP_STATE_KEY) || {}) as any;
      const token = (state.authToken as string) || '';
      if (!token) throw new Error('Authentication required');
      const data = await listApplications(token);
      setApps(data || []);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      const matchesSearch = app.company.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           app.job_title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [apps, searchQuery, statusFilter]);

  const updateStatus = async (appId: number, status: string) => {
    try {
      const state = (loadState(APP_STATE_KEY) || {}) as any;
      const token = (state.authToken as string) || '';
      await updateApplication(appId, { status }, token);
      setApps(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const saveNotes = async (appId: number, notes: string) => {
    try {
      const state = (loadState(APP_STATE_KEY) || {}) as any;
      const token = (state.authToken as string) || '';
      await updateApplication(appId, { notes }, token);
      setApps(prev => prev.map(a => a.id === appId ? { ...a, notes } : a));
      if (selectedApp?.id === appId) {
        setSelectedApp({ ...selectedApp, notes });
      }
    } catch (err) {
      console.error('Notes save failed:', err);
    }
  };

  const deleteApp = async (appId: number) => {
    if (!confirm('Permanently remove this application from your tracker?')) return;
    try {
      const state = (loadState(APP_STATE_KEY) || {}) as any;
      const token = (state.authToken as string) || '';
      await deleteApplication(appId, token);
      setApps(apps.filter(a => a.id !== appId));
      if (selectedApp?.id === appId) setSelectedApp(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  function handleDragStart(event: any) {
    setActiveId(event.active.id);
  }

  function handleDragEnd(event: any) {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
       const overId = over.id;
       const activeApp = apps.find(a => a.id === active.id);
       let newStatus = STAGES.some(s => s.id === overId) ? overId : apps.find(a => a.id === overId)?.status;
       if (newStatus && activeApp.status !== newStatus) {
          updateStatus(activeApp.id, newStatus);
       }
    }
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
       <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-blue-600" size={40} />
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Syncing Pipeline...</p>
       </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-10 px-6 space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
         <div className="space-y-1">
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Application CRM</h1>
           <p className="text-slate-500 font-medium">Strategic tracking for your job search journey.</p>
         </div>
         
         <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search company or role..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition w-64"
              />
            </div>
            
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>

            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
               <button onClick={() => setView('table')} className={clsx("p-2 rounded-lg transition-all", view === 'table' ? "bg-slate-100 text-slate-900" : "text-slate-400")}><ListIcon size={18} /></button>
               <button onClick={() => setView('kanban')} className={clsx("p-2 rounded-lg transition-all", view === 'kanban' ? "bg-slate-100 text-slate-900" : "text-slate-400")}><LayoutGrid size={18} /></button>
            </div>
         </div>
      </div>

      {view === 'kanban' ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full min-h-[600px]">
             {STAGES.map((stage) => (
               <KanbanColumn 
                 key={stage.id} 
                 stage={stage} 
                 apps={filteredApps.filter(a => a.status === stage.id)}
                 onDelete={deleteApp}
                 onClickCard={setSelectedApp}
                 onUpdateStatus={updateStatus}
               />
             ))}
          </div>
          <DragOverlay>
            {activeId ? <div className="opacity-80 scale-105 pointer-events-none"><KanbanCard app={apps.find(a => a.id === activeId)} onDelete={() => {}} onClick={() => {}} isOverlay /></div> : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden overflow-x-auto">
           <table className="w-full text-left min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                 <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity & Role</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stage</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">ATS Match</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest"></th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {filteredApps.map((app) => (
                   <tr key={app.id} onClick={() => setSelectedApp(app)} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                      <td className="px-8 py-6">
                         <div className="font-bold text-slate-900">{app.company}</div>
                         <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{app.job_title}</div>
                      </td>
                      <td className="px-8 py-6"><StatusBadge status={app.status} /></td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-3">
                            <span className={clsx("text-sm font-black", (app.ats_score || 0) >= 80 ? "text-green-600" : "text-blue-600")}>{app.ats_score ? `${Math.round(app.ats_score)}%` : '--'}</span>
                            {app.ats_score && <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden"><div className="bg-blue-600 h-full" style={{ width: `${app.ats_score}%` }} /></div>}
                         </div>
                      </td>
                      <td className="px-8 py-6 text-xs text-slate-400 font-bold">{new Date(app.created_at).toLocaleDateString()}</td>
                      <td className="px-8 py-6 text-right">
                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={(e) => { e.stopPropagation(); deleteApp(app.id); }} className="p-2 text-slate-300 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all"><Trash2 size={16} /></button>
                            {app.job_url && <a href={app.job_url} target="_blank" onClick={e => e.stopPropagation()} className="p-2 text-slate-300 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all"><ExternalLink size={16} /></a>}
                         </div>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedApp && (
        <Modal app={selectedApp} onClose={() => setSelectedApp(null)} onSaveNotes={saveNotes} onUpdateStatus={updateStatus} />
      )}
    </div>
  );
}

function KanbanColumn({ stage, apps, onDelete, onClickCard, onUpdateStatus }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div className="flex flex-col gap-4 min-w-[280px]">
      <div className="flex items-center justify-between px-3">
         <div className="flex items-center gap-2">
            <div className={clsx("w-2 h-2 rounded-full", stage.color)}></div>
            <h3 className="font-black text-slate-600 uppercase tracking-[0.2em] text-[10px]">{stage.label}</h3>
            <span className="text-[10px] font-black text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{apps.length}</span>
         </div>
      </div>
      <div ref={setNodeRef} id={stage.id} className={clsx("flex-1 rounded-[2.5rem] p-4 space-y-4 border-2 transition-all", isOver ? "border-blue-400 bg-blue-50/50" : "border-dashed border-slate-200 bg-white/50", stage.border)}>
        <SortableContext items={apps.map((a:any) => a.id)} strategy={verticalListSortingStrategy}>
          {apps.map((app: any) => <KanbanCard key={app.id} app={app} onDelete={onDelete} onClick={() => onClickCard(app)} onUpdateStatus={onUpdateStatus} />)}
          {apps.length === 0 && <div className="h-24 flex items-center justify-center"><p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Drop here</p></div>}
        </SortableContext>
      </div>
    </div>
  );
}

function KanbanCard({ app, onDelete, onClick, isOverlay, onUpdateStatus }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: app.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={clsx("bg-white p-5 rounded-3xl shadow-sm border border-slate-200 transition-all group relative overflow-hidden hover:shadow-xl hover:border-blue-200", isDragging && "opacity-30", !isOverlay && "cursor-grab active:cursor-grabbing")}>
       <div {...(!isOverlay ? { ...attributes, ...listeners } : {})} onClick={onClick} className="absolute inset-0 z-0" />
       <div className="relative z-10 pointer-events-none flex justify-between items-start mb-4">
          <div className="space-y-1">
             <h4 className="font-bold text-slate-900 text-sm leading-tight line-clamp-1">{app.company}</h4>
             <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider line-clamp-1">{app.job_title}</p>
          </div>
          <div className="flex items-center gap-1 pointer-events-auto">
             <select 
               value={app.status} 
               onChange={(e) => { e.stopPropagation(); onUpdateStatus && onUpdateStatus(app.id, e.target.value); }}
               className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 hover:border-blue-200 transition outline-none cursor-pointer"
             >
               {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
             </select>
             <button onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onDelete(app.id); }} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors bg-white rounded-lg border border-transparent hover:border-red-100 hover:bg-red-50"><Trash2 size={12} /></button>
          </div>
       </div>
       <div className="relative z-10 pointer-events-none flex items-center justify-between mt-4">
          <div className="flex items-center gap-1.5"><Calendar size={10} className="text-slate-300" /><span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">{new Date(app.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></div>
          <div className={clsx("text-[9px] font-black px-2.5 py-1 rounded-full border tracking-widest uppercase", (app.ats_score || 0) >= 80 ? "bg-green-50 text-green-600 border-green-100" : "bg-blue-50 text-blue-600 border-blue-100")}>ATS {app.ats_score ? `${Math.round(app.ats_score)}%` : '--'}</div>
       </div>
    </div>
  );
}

function Modal({ app, onClose, onSaveNotes, onUpdateStatus }: any) {
  const [notes, setNotes] = useState(app.notes || '');
  const [saving, setSaving] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(app.status);

  const handleStatusChange = async (newStatus: string) => {
    setCurrentStatus(newStatus);
    await onUpdateStatus(app.id, newStatus);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-100 flex items-start justify-between">
          <div className="flex gap-4">
            <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xl font-black">{app.company[0]}</div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{app.job_title}</h2>
              <div className="text-slate-500 font-bold flex items-center gap-2">{app.company} <StatusBadge status={currentStatus} /></div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"><X size={24} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><StickyNote size={14} /> Application Notes</h3>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update Stage:</span>
                   <select 
                     value={currentStatus} 
                     onChange={(e) => handleStatusChange(e.target.value)}
                     className="bg-slate-50 border border-slate-100 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none focus:ring-2 focus:ring-blue-500 transition"
                   >
                     {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                   </select>
                </div>
              </div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add private notes about your interview, contacts, or follow-up strategy..." className="w-full h-40 bg-slate-50 rounded-2xl border border-slate-100 p-6 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition resize-none" />
              <div className="flex justify-end mt-3">
                <button onClick={async () => { setSaving(true); await onSaveNotes(app.id, notes); setSaving(false); }} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Notes
                </button>
              </div>
            </section>
            {app.job_description && (
              <section>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Briefcase size={14} /> Job Description</h3>
                <div className="bg-slate-50 rounded-2xl p-6 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">{app.job_description}</div>
              </section>
            )}
          </div>
          <div className="space-y-6">
             <div className="bg-slate-50 rounded-[2rem] p-6 space-y-6 border border-slate-100">
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ATS Match</p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-blue-600">{app.ats_score ? `${Math.round(app.ats_score)}%` : '--'}</span>
                    <span className="text-[10px] font-bold text-slate-400 mb-1">Score Alignment</span>
                  </div>
               </div>
               {app.resume_name && (
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Optimized Resume</p>
                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
                       <FileText size={18} className="text-blue-600" />
                       <span className="text-xs font-bold text-slate-700 truncate">{app.resume_name}</span>
                    </div>
                 </div>
               )}
               <div className="pt-4 border-t border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Quick Links</p>
                  {app.job_url && <a href={app.job_url} target="_blank" className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:border-blue-200 transition text-xs font-bold text-slate-700">Original Posting <ExternalLink size={14} /></a>}
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: any = {
    applied: { icon: <Clock size={12} />, label: 'Applied', color: 'text-blue-600 bg-blue-50 border-blue-100' },
    review: { icon: <ExternalLink size={12} />, label: 'Review', color: 'text-orange-600 bg-orange-50 border-orange-100' },
    interview: { icon: <Zap size={12} />, label: 'Interview', color: 'text-purple-600 bg-purple-50 border-purple-100' },
    rejected: { icon: <XCircle size={12} />, label: 'Rejected', color: 'text-red-600 bg-red-50 border-red-100' },
    offer: { icon: <CheckCircle2 size={12} />, label: 'Offer', color: 'text-green-600 bg-green-50 border-green-100' },
  };
  const c = config[status] || config.applied;
  return (
    <span className={clsx("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border", c.color)}>
       {c.icon} {c.label}
    </span>
  );
}
