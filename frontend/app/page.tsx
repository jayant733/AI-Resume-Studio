import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/70 bg-gradient-to-br from-white via-mist to-white p-8 shadow-soft sm:p-12">
      <div className="pointer-events-none absolute -top-20 right-0 h-56 w-56 rounded-full bg-accent/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-cyan-200/30 blur-3xl" />
      <div className="relative mx-auto max-w-4xl text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">AI Resume SaaS</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight text-ink sm:text-5xl">
          Land better interviews with a role-targeted resume pipeline.
        </h1>
        <p className="mt-6 text-base leading-8 text-slate">
          Parse resumes, match against job descriptions, optimize bullets with AI, and generate ATS-ready outputs with recruiter-grade insights.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex rounded-full bg-ink px-6 py-3 text-sm font-medium text-white transition hover:bg-ink/90"
          >
            Sign up
          </Link>
          <Link
            href="/login"
            className="inline-flex rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-ink transition hover:bg-slate-50"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
