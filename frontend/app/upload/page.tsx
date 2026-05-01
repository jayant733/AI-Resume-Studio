"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useCallback } from "react";
import { 
  UploadCloud, FileText, CheckCircle2, AlertCircle, 
  Loader2, Linkedin, ArrowRight, X, User, Briefcase, GraduationCap 
} from "lucide-react";
import { uploadResume } from "@/lib/api";
import { APP_STATE_KEY, loadState, mergeState } from "@/lib/storage";
import { UploadResponse, ParsedResume } from "@/lib/types";
import { clsx } from "clsx";

type Step = "upload" | "preview";

export default function UploadPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<UploadResponse | null>(null);
  const [linkedinJson, setLinkedinJson] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "application/pdf" || selectedFile.name.endsWith(".docx")) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError("Invalid file type. Please upload a PDF or DOCX file.");
        setFile(null);
      }
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (droppedFile.type === "application/pdf" || droppedFile.name.endsWith(".docx")) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError("Invalid file type. Please upload a PDF or DOCX file.");
        setFile(null);
      }
    }
  }, []);

  async function handleUpload() {
    if (!file && !linkedinJson) {
      setError("Please select a file or paste LinkedIn JSON first.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const formData = new FormData();
      if (file) formData.append("resume_file", file);
      if (linkedinJson) formData.append("linkedin_json", linkedinJson);

      const state = loadState(APP_STATE_KEY) || {};
      const result = await uploadResume(formData, (state as any).authToken);
      
      setParsedData(result);
      mergeState(APP_STATE_KEY, { upload: result });
      setStep("preview");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  const proceedToJobMatch = () => {
    router.push("/job");
  };

  return (
    <div className="max-w-4xl mx-auto py-10">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">
          {step === "upload" ? "Upload your Resume" : "Review Extracted Data"}
        </h1>
        <p className="text-slate-500 font-medium">
          {step === "upload" 
            ? "Our AI will parse your experience, skills, and education automatically." 
            : "We've parsed your resume. Verify the details before we optimize for your target job."}
        </p>
      </div>

      {step === "upload" ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Main Upload Zone */}
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className={clsx(
              "relative group rounded-[2.5rem] border-4 border-dashed p-12 flex flex-col items-center justify-center transition-all",
              file 
                ? "border-blue-500 bg-blue-50/50" 
                : "border-slate-200 bg-white hover:border-blue-400 hover:bg-slate-50"
            )}
          >
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              onChange={handleFileChange}
              accept=".pdf,.docx"
            />
            
            <div className={clsx(
              "p-6 rounded-3xl mb-6 transition-transform group-hover:scale-110",
              file ? "bg-blue-600 text-white shadow-xl shadow-blue-200" : "bg-slate-100 text-slate-400"
            )}>
              {file ? <CheckCircle2 size={40} /> : <UploadCloud size={40} />}
            </div>

            {file ? (
              <div className="text-center">
                <p className="text-xl font-black text-slate-900 mb-1">{file.name}</p>
                <p className="text-sm font-bold text-blue-600">File selected • {(file.size / 1024).toFixed(1)} KB</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="mt-4 text-xs font-black uppercase tracking-widest text-red-500 hover:text-red-600 flex items-center gap-1 mx-auto"
                >
                  <X size={14} /> Remove file
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-xl font-black text-slate-900 mb-2">Drag & drop or click to upload</p>
                <p className="text-sm font-medium text-slate-400">Supports PDF and DOCX (Max 10MB)</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* LinkedIn Optional Import */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Linkedin size={20} /></div>
                <h3 className="text-lg font-black text-slate-900">LinkedIn Import</h3>
              </div>
              <p className="text-sm text-slate-500 font-medium mb-4">Paste your LinkedIn JSON profile for even more accurate parsing.</p>
              <textarea
                value={linkedinJson}
                onChange={(e) => setLinkedinJson(e.target.value)}
                placeholder='{"basics": {...}}'
                className="w-full h-32 rounded-2xl border border-slate-200 p-4 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {/* Error & Progress */}
            <div className="flex flex-col justify-center gap-6">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 p-6 rounded-[2rem] flex items-start gap-3">
                  <AlertCircle className="shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-black">Invalid selection</p>
                    <p className="text-xs font-medium opacity-80">{error}</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={loading || (!file && !linkedinJson)}
                className={clsx(
                  "w-full py-5 rounded-[2rem] text-lg font-black flex items-center justify-center gap-3 shadow-xl transition-all",
                  loading || (!file && !linkedinJson)
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={24} />
                    Processing with AI...
                  </>
                ) : (
                  <>
                    Parse & Optimize Resume
                    <ArrowRight size={24} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in zoom-in-95 duration-500 space-y-8">
          {/* Parsing Preview */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 text-green-600 rounded-xl"><CheckCircle2 size={20} /></div>
                <h3 className="text-lg font-black text-slate-900">AI Extraction Summary</h3>
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Successful</span>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-6">
                <PreviewItem 
                  icon={<User size={16} />} 
                  label="Contact Info" 
                  value={parsedData?.parsed_resume.name || "N/A"} 
                  sub={parsedData?.parsed_resume.contact.email || ""}
                />
                <PreviewItem 
                  icon={<Briefcase size={16} />} 
                  label="Experience" 
                  value={`${parsedData?.parsed_resume.experience.length || 0} Roles Found`} 
                />
              </div>

              <div className="md:col-span-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Top Extracted Skills</p>
                <div className="flex flex-wrap gap-2">
                  {parsedData?.parsed_resume.skills.slice(0, 15).map((skill, i) => (
                    <span key={i} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200">
                      {skill}
                    </span>
                  ))}
                  {(!parsedData?.parsed_resume.skills || parsedData.parsed_resume.skills.length === 0) && (
                    <p className="text-xs text-slate-400 font-medium italic">No skills explicitly identified.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep("upload")}
              className="flex-1 py-5 rounded-[2rem] border border-slate-200 bg-white text-slate-700 font-black hover:bg-slate-50 transition"
            >
              Re-upload File
            </button>
            <button
              onClick={proceedToJobMatch}
              className="flex-[2] py-5 rounded-[2rem] bg-blue-600 text-white font-black hover:bg-blue-700 shadow-xl shadow-blue-100 flex items-center justify-center gap-3 transition"
            >
              Confirm & Match with Job
              <ArrowRight size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewItem({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="flex gap-4">
      <div className="p-2.5 bg-slate-50 text-slate-400 rounded-xl h-fit">{icon}</div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-500 font-medium">{sub}</p>}
      </div>
    </div>
  );
}
