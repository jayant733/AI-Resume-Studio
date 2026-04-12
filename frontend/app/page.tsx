import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="max-w-3xl rounded-[32px] border border-white/70 bg-white/85 p-10 text-center shadow-soft backdrop-blur">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Production Grade AI SaaS</p>
        <h1 className="mt-4 text-5xl font-semibold leading-tight text-ink">
          Build tailored, ATS-ready resumes with retrieval, agents, and multimodal AI.
        </h1>
        <p className="mt-6 text-base leading-8 text-slate">
          Upload a resume, match it against a job description, rewrite the strongest achievements, and export a polished PDF.
        </p>
        <Link
          href="/upload"
          className="mt-8 inline-flex rounded-full bg-ink px-6 py-3 text-sm font-medium text-white transition hover:bg-ink/90"
        >
          Start the workflow
        </Link>
      </div>
    </div>
  );
}
