'use client';

import React from 'react';
import TemplateGrid from '@/components/templates/TemplateGrid';
import { ChevronLeft, Info } from 'lucide-react';
import Link from 'next/link';

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
             <Link href="/builder" className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-200">
               <ChevronLeft size={24} />
             </Link>
             <div>
               <h1 className="text-3xl font-black text-slate-900">Design Gallery</h1>
               <p className="text-slate-500 font-medium">Select a strategic layout for your next career move.</p>
             </div>
           </div>

           <div className="flex items-center gap-3 bg-blue-600 px-6 py-3 rounded-2xl text-white shadow-lg shadow-blue-200">
              <Info size={20} />
              <div className="text-xs">
                <p className="font-bold uppercase tracking-widest">Pro Tip</p>
                <p className="font-medium opacity-90">ATS-Optimized templates have 40% higher pass rates.</p>
              </div>
           </div>
        </div>

        <div className="bg-white rounded-[2rem] p-10 border border-slate-200 shadow-xl shadow-slate-200/50">
           <TemplateGrid />
        </div>

      </div>
    </div>
  );
}
