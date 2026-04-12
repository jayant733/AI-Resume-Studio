"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/card";
import { ResumePreview } from "@/components/resume-preview";
import { loadState } from "@/lib/storage";
import { GeneratedResume, UploadResponse } from "@/lib/types";
import { resolvePdfUrl } from "@/lib/api";

export default function PreviewPage() {
  const router = useRouter();
  const [upload, setUpload] = useState<UploadResponse | null>(null);
  const [generated, setGenerated] = useState<GeneratedResume | null>(null);

  useEffect(() => {
    const state = loadState();
    if (!state.upload) {
      router.replace("/upload");
      return;
    }
    setUpload(state.upload);
    setGenerated(state.generated || null);
  }, [router]);

  if (!upload) {
    return null;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr,1.2fr]">
      <Card title="Resume Output" description="Review the generated content or fall back to parsed resume data.">
        <div className="space-y-4 text-sm text-ink/90">
          <p>Candidate: {upload.parsed_resume.name || "Unknown"}</p>
          <p>Summary available: {generated?.optimized_resume?.summary ? "Yes" : "Using parsed summary"}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            {generated ? (
              <a
                className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-white"
                href={resolvePdfUrl(generated.pdf_download_url)}
                target="_blank"
              >
                Download PDF
              </a>
            ) : null}
            <Link className="rounded-full border border-slate-300 px-6 py-3 text-sm font-medium" href="/suggestions">
              Back to suggestions
            </Link>
          </div>
        </div>
      </Card>
      <ResumePreview parsedResume={upload.parsed_resume} generated={(generated?.optimized_resume || undefined) as Record<string, unknown> | undefined} />
    </div>
  );
}
