'use client';

import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useResumeStore } from '@/lib/store/resumeStore';
import debounce from 'lodash.debounce';
import { Loader2 } from 'lucide-react';

export default function ResumePreview() {
  const { resumeData, templateId } = useResumeStore();
  const [html, setHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const fetchPreview = async (data: any, tid: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/templates/render-preview`,
        { resume_data: data, template_id: tid },
        { withCredentials: true }
      );
      setHtml(response.data);
    } catch (error) {
      console.error('Failed to fetch preview:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce the preview update to avoid too many API calls
  const debouncedFetch = useRef(
    debounce((data, tid) => fetchPreview(data, tid), 500)
  ).current;

  useEffect(() => {
    debouncedFetch(resumeData, templateId);
  }, [resumeData, templateId, debouncedFetch]);

  useEffect(() => {
    if (iframeRef.current && html) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [html]);

  return (
    <div className="relative w-full h-full min-h-[600px] bg-slate-100 rounded-lg shadow-inner overflow-hidden border border-slate-200">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}
      
      <iframe
        ref={iframeRef}
        title="Resume Preview"
        className="w-full h-full border-none"
        style={{ zoom: '0.75', transformOrigin: 'top left', width: '133.33%', height: '133.33%' }}
      />
    </div>
  );
}
