'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useResumeStore } from '@/lib/store/resumeStore';
import debounce from '@/lib/debounce';
import { Loader2 } from 'lucide-react';
import { APP_STATE_KEY, loadState } from '@/lib/storage';
import { renderTemplatePreview } from '@/lib/api';

export default function ResumePreview() {
  const { resumeData, templateId } = useResumeStore();
  const [html, setHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const fetchPreview = async (data: any, tid: string) => {
    setIsLoading(true);
    setError('');
    try {
      const state = (loadState(APP_STATE_KEY) || {}) as any;
      const token = (state.authToken as string) || '';
      if (!token) throw new Error('Authentication required');

      const res = await renderTemplatePreview({ resume_data: data, template_id: tid }, token);
      setHtml(res.html);
    } catch (error: any) {
      console.error('Failed to fetch preview:', error);
      setError(error?.message || 'Failed to render preview.');
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce the preview update to avoid too many API calls
  const debouncedFetch = useRef(
    debounce((data: any, tid: string) => fetchPreview(data, tid), 500)
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

      {error && !isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
            <p className="text-sm font-bold text-slate-800">Preview unavailable</p>
            <p className="text-xs text-slate-500 mt-1">{error}</p>
          </div>
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
