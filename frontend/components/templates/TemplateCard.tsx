'use client';

import React from 'react';
import { useResumeStore } from '@/lib/store/resumeStore';
import { Check, Lock } from 'lucide-react';
import { clsx } from 'clsx';

interface Template {
  id: string;
  name: string;
  category: string;
  is_premium: boolean;
  locked?: boolean;
  description: string;
}

export default function TemplateCard({ 
  template, 
  isActive 
}: { 
  template: Template; 
  isActive: boolean 
}) {
  const { setTemplateId } = useResumeStore();

  const handleSelect = () => {
    if (template.locked) return;
    setTemplateId(template.id);
  };

  return (
    <div 
      onClick={handleSelect}
      className={clsx(
        "group relative p-3 bg-white border-2 rounded-xl transition-all cursor-pointer overflow-hidden",
        isActive ? "border-blue-600 shadow-md" : "border-slate-100 hover:border-slate-300 shadow-sm",
        template.locked && "opacity-80 cursor-not-allowed"
      )}
    >
      <div className="aspect-[3/4] bg-slate-100 rounded-lg mb-3 flex items-center justify-center relative">
         {/* Placeholder for template thumbnail */}
         <div className="text-center p-4">
           <div className="w-12 h-1 bg-slate-300 mx-auto mb-2" />
           <div className="w-16 h-1 bg-slate-200 mx-auto mb-1" />
           <div className="w-14 h-1 bg-slate-200 mx-auto" />
         </div>

         {isActive && (
           <div className="absolute top-2 right-2 p-1 bg-blue-600 text-white rounded-full shadow-lg">
             <Check size={14} />
           </div>
         )}
         
         {template.locked && (
           <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center backdrop-blur-[1px]">
             <div className="flex flex-col items-center gap-1 text-white">
                <Lock size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Premium</span>
             </div>
           </div>
         )}
      </div>

      <div className="space-y-1">
        <h4 className="font-bold text-sm text-slate-800 line-clamp-1">{template.name}</h4>
        <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{template.description}</p>
      </div>

      {!template.locked && !isActive && (
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] font-bold text-blue-600 uppercase">Use Style</span>
        </div>
      )}
    </div>
  );
}
