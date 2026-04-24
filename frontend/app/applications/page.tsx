'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
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
  ChevronRight
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
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const STAGES = [
  { id: 'applied', label: 'Applied', color: 'bg-blue-500', border: 'border-blue-200' },
  { id: 'interview', label: 'Interview', color: 'bg-purple-500', border: 'border-purple-200' },
  { id: 'rejected', label: 'Rejected', color: 'bg-red-500', border: 'border-red-200' },
  { id: 'offer', label: 'Offer', color: 'bg-green-500', border: 'border-green-200' },
];

export default function ApplicationsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [view, setView] = useState<'table' | 'kanban'>('kanban');
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);

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
      setApps(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const deleteApp = async (appId: number) => {
    if (!confirm('Permanently remove this application from your tracker?')) return;
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/applications/${appId}`, { withCredentials: true });
      setApps(apps.filter(a => a.id !== appId));
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
       // If dropped over a column or another item
       const overId = over.id;
       const activeApp = apps.find(a => a.id === active.id);
       
       let newStatus = '';
       if (STAGES.some(s => s.id === overId)) {
          newStatus = overId;
       } else {
          const overApp = apps.find(a => a.id === overId);
          if (overApp) newStatus = overApp.status;
       }

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
    <div className="min-h-screen bg-slate-50 p-8 space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between">
         <div className="space-y-1">
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Application CRM</h1>
           <p className="text-slate-500 font-medium">Strategic tracking for your job search journey.</p>
         </div>
         
         <div className="flex items-center gap-4">
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
               <button 
                 onClick={() => setView('table')} 
                 className={clsx("p-2 rounded-lg transition-all", view === 'table' ? "bg-slate-100 text-slate-900 shadow-inner" : "text-slate-400 hover:text-slate-600")}
               >
                 <ListIcon size={18} />
               </button>
               <button 
                 onClick={() => setView('kanban')} 
                 className={clsx("p-2 rounded-lg transition-all", view === 'kanban' ? "bg-slate-100 text-slate-900 shadow-inner" : "text-slate-400 hover:text-slate-600")}
               >
                 <LayoutGrid size={18} />
               </button>
            </div>
            <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all group">
               <Plus size={18} className="group-hover:rotate-90 transition-transform" /> 
               Log Application
            </button>
         </div>
      </div>

      {view === 'kanban' ? (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-4 gap-6 h-[calc(100vh-250px)]">
             {STAGES.map((stage) => (
               <KanbanColumn 
                 key={stage.id} 
                 stage={stage} 
                 apps={apps.filter(a => a.status === stage.id)}
                 onDelete={deleteApp}
               />
             ))}
          </div>
          <DragOverlay>
            {activeId ? (
              <div className="opacity-80 scale-105 pointer-events-none">
                 <KanbanCard app={apps.find(a => a.id === activeId)} onDelete={() => {}} isOverlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden">
           <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                 <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Entity</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pipeline Stage</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">ATS Readiness</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Logged Date</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest"></th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {apps.map((app) => (
                   <tr key={app.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-6">
                         <div className="font-bold text-slate-900">{app.company}</div>
                         <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{app.job_title}</div>
                      </td>
                      <td className="px-8 py-6">
                         <StatusBadge status={app.status} />
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-3">
                            <span className={clsx(
                              "text-sm font-black",
                              (app.ats_score || 0) >= 80 ? "text-green-600" : (app.ats_score || 0) >= 60 ? "text-blue-600" : "text-slate-400"
                            )}>
                              {app.ats_score ? `${Math.round(app.ats_score)}%` : '--'}
                            </span>
                            {app.ats_score && (
                              <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                 <div className="bg-blue-600 h-full" style={{ width: `${app.ats_score}%` }} />
                              </div>
                            )}
                         </div>
                      </td>
                      <td className="px-8 py-6 text-xs text-slate-400 font-bold">
                         {new Date(app.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-8 py-6 text-right">
                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-0 translate-x-4">
                            <button onClick={() => deleteApp(app.id)} className="p-2 text-slate-300 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all"><Trash2 size={16} /></button>
                            {app.job_url && <a href={app.job_url} target="_blank" className="p-2 text-slate-300 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all"><ExternalLink size={16} /></a>}
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

function KanbanColumn({ stage, apps, onDelete }: any) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-3">
         <div className="flex items-center gap-2">
            <div className={clsx("w-2 h-2 rounded-full", stage.color)}></div>
            <h3 className="font-black text-slate-600 uppercase tracking-[0.2em] text-[10px]">{stage.label}</h3>
            <span className="text-[10px] font-black text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
              {apps.length}
            </span>
         </div>
         <MoreVertical size={14} className="text-slate-300" />
      </div>

      <div 
        id={stage.id}
        className={clsx(
          "flex-1 rounded-[2.5rem] p-4 space-y-4 overflow-y-auto border-2 border-dashed transition-colors duration-300 custom-scrollbar",
          stage.border,
          "bg-slate-50/50"
        )}
      >
        <SortableContext items={apps.map((a:any) => a.id)} strategy={verticalListSortingStrategy}>
          {apps.map((app: any) => (
            <KanbanCard key={app.id} app={app} onDelete={onDelete} />
          ))}
          {apps.length === 0 && (
            <div className="h-24 flex items-center justify-center">
               <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Empty Stage</p>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

function KanbanCard({ app, onDelete, isOverlay }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: app.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        "bg-white p-5 rounded-3xl shadow-sm border border-slate-200 transition-all group cursor-grab active:cursor-grabbing relative overflow-hidden",
        isDragging && "opacity-30",
        !isOverlay && "hover:shadow-xl hover:shadow-slate-200/50 hover:border-blue-200"
      )}
    >
       {app.ats_score && (
          <div className="absolute top-0 right-0 h-1 bg-blue-600" style={{ width: `${app.ats_score}%` }} />
       )}

       <div className="flex justify-between items-start mb-4">
          <div className="space-y-1">
             <h4 className="font-bold text-slate-900 text-sm leading-tight line-clamp-1">{app.company}</h4>
             <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider line-clamp-1">{app.job_title}</p>
          </div>
          <button 
            onPointerDown={(e) => e.stopPropagation()} 
            onClick={() => onDelete(app.id)} 
            className="p-1 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={12} />
          </button>
       </div>

       <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-1.5">
             <Calendar size={10} className="text-slate-300" />
             <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">
               {new Date(app.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
             </span>
          </div>
          
          <div className={clsx(
            "text-[9px] font-black px-2.5 py-1 rounded-full border tracking-widest uppercase",
            (app.ats_score || 0) >= 80 ? "bg-green-50 text-green-600 border-green-100" : "bg-blue-50 text-blue-600 border-blue-100"
          )}>
            ATS {app.ats_score ? `${Math.round(app.ats_score)}%` : '--'}
          </div>
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
    <div className={clsx("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border", c.color)}>
       {c.icon} {c.label}
    </div>
  );
}
