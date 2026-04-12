"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Card } from "@/components/card";
import { uploadResume } from "@/lib/api";
import { mergeState } from "@/lib/storage";

export default function UploadPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const formData = new FormData(event.currentTarget);
      const result = await uploadResume(formData);
      mergeState({ upload: result });
      router.push("/job");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Upload Resume" description="Accept PDF, DOCX, or LinkedIn JSON plus an optional profile image.">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <input className="rounded-2xl border border-slate-200 px-4 py-3" name="full_name" placeholder="Full name" />
          <input className="rounded-2xl border border-slate-200 px-4 py-3" name="email" placeholder="Email" type="email" />
          <div className="md:col-span-2 rounded-3xl border border-dashed border-slate-300 bg-mist/70 p-6">
            <label className="mb-2 block text-sm font-medium text-ink">Resume file</label>
            <input name="resume_file" type="file" accept=".pdf,.docx" />
            <p className="mt-2 text-xs text-slate">Use PDF or DOCX here, or skip this and paste LinkedIn JSON below.</p>
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-ink">LinkedIn JSON</label>
            <textarea
              className="min-h-40 w-full rounded-3xl border border-slate-200 px-4 py-3"
              name="linkedin_json"
              placeholder='{"basics":{"name":"..."},"positions":[]}'
            />
          </div>
          <div className="md:col-span-2 rounded-3xl border border-dashed border-slate-300 bg-white p-6">
            <label className="mb-2 block text-sm font-medium text-ink">Profile image</label>
            <input name="profile_image" type="file" accept=".png,.jpg,.jpeg" />
          </div>
          {error ? <p className="md:col-span-2 text-sm text-red-600">{error}</p> : null}
          <div className="md:col-span-2 flex justify-end">
            <button className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-white" disabled={loading} type="submit">
              {loading ? "Uploading..." : "Parse resume"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
