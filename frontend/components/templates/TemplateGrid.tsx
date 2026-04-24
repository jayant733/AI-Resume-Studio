'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import TemplateCard from './TemplateCard';
import { useResumeStore } from '@/lib/store/resumeStore';
import { Search, Filter } from 'lucide-react';

export default function TemplateGrid() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const { templateId } = useResumeStore();

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/templates`, {
          withCredentials: true
        });
        setTemplates(response.data);
      } catch (err) {
        console.error('Failed to load templates:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))];
  
  const filteredTemplates = templates.filter(t => 
    activeCategory === 'all' || t.category === activeCategory
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Choose a Template</h2>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                activeCategory === cat 
                ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200" 
                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="aspect-[3/4] bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard 
              key={template.id} 
              template={template} 
              isActive={templateId === template.id} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
