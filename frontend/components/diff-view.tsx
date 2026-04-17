"use client";

type WordDiff =
  | { type: "same"; text: string }
  | { type: "added"; text: string }
  | { type: "removed"; text: string };

function diffWords(original: string, updated: string): WordDiff[] {
  const a = original.split(/\s+/).filter(Boolean);
  const b = updated.split(/\s+/).filter(Boolean);

  // Simple LCS-based diff
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: WordDiff[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: "same", text: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "added", text: b[j - 1] });
      j--;
    } else {
      result.unshift({ type: "removed", text: a[i - 1] });
      i--;
    }
  }
  return result;
}

function DiffLine({ original, optimized }: { original: string; optimized: string }) {
  const diffs = diffWords(original, optimized);
  return (
    <span className="text-sm leading-7">
      {diffs.map((d, i) =>
        d.type === "added" ? (
          <mark key={i} className="rounded bg-green-100 px-0.5 text-green-800 no-underline">
            {d.text}
          </mark>
        ) : d.type === "removed" ? (
          <del key={i} className="rounded bg-red-50 px-0.5 text-red-600 line-through opacity-70">
            {d.text}
          </del>
        ) : (
          <span key={i}>{d.text} </span>
        )
      )}
    </span>
  );
}

type ExpEntry = { title?: string; company?: string; bullets?: string[] };

export function DiffView({
  original,
  optimized,
}: {
  original: Record<string, unknown>;
  optimized: Record<string, unknown>;
}) {
  const originalSummary = typeof original.summary === "string" ? original.summary : "";
  const optimizedSummary = typeof optimized.summary === "string" ? optimized.summary : "";
  const originalSkills = Array.isArray(original.skills) ? (original.skills as string[]) : [];
  const optimizedSkills = Array.isArray(optimized.skills) ? (optimized.skills as string[]) : [];
  const origExp = (original.experience as ExpEntry[] | undefined) || [];
  const optExp = (optimized.experience as ExpEntry[] | undefined) || [];
  const maxSections = Math.max(origExp.length, optExp.length);

  return (
    <div className="space-y-8">
      {/* Summary diff */}
      {(originalSummary || optimizedSummary) && (
        <section>
          <h3 className="mb-3 border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate">
            Summary
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-red-100 bg-red-50/40 p-4">
              <p className="mb-2 text-xs font-semibold text-red-500 uppercase tracking-wide">Original</p>
              <p className="text-sm leading-7 text-ink/80">{originalSummary || "—"}</p>
            </div>
            <div className="rounded-2xl border border-green-100 bg-green-50/40 p-4">
              <p className="mb-2 text-xs font-semibold text-green-600 uppercase tracking-wide">Optimized</p>
              <p className="text-sm leading-7 text-ink">
                <DiffLine
                  original={originalSummary}
                  optimized={optimizedSummary}
                />
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Experience bullet diffs */}
      {maxSections > 0 && (
        <section>
          <h3 className="mb-3 border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate">
            Experience — Bullet Changes
          </h3>
          <div className="space-y-6">
            {Array.from({ length: maxSections }).map((_, si) => {
              const orig = origExp[si];
              const opt = optExp[si];
              if (!orig && !opt) return null;
              const maxBullets = Math.max(orig?.bullets?.length || 0, opt?.bullets?.length || 0);
              if (maxBullets === 0) return null;

              return (
                <div key={si} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                  <p className="mb-3 font-semibold text-ink">
                    {String(opt?.title || orig?.title || `Role ${si + 1}`)}
                    {(opt?.company || orig?.company) && (
                      <span className="ml-2 text-sm font-normal text-slate">
                        @ {String(opt?.company || orig?.company)}
                      </span>
                    )}
                  </p>
                  <div className="space-y-3">
                    {Array.from({ length: maxBullets }).map((_, bi) => {
                      const origBullet = orig?.bullets?.[bi] || "";
                      const optBullet = opt?.bullets?.[bi] || "";
                      if (!origBullet && !optBullet) return null;
                      return (
                        <div key={bi} className="grid gap-2 md:grid-cols-2">
                          <div className="rounded-xl border border-red-100 bg-red-50/30 px-3 py-2">
                            <p className="text-xs font-medium text-red-400 mb-1">Before</p>
                            <p className="text-xs text-ink/70 leading-6">{origBullet || "—"}</p>
                          </div>
                          <div className="rounded-xl border border-green-100 bg-green-50/30 px-3 py-2">
                            <p className="text-xs font-medium text-green-500 mb-1">After</p>
                            <p className="text-xs leading-6">
                              {origBullet && optBullet ? (
                                <DiffLine original={origBullet} optimized={optBullet} />
                              ) : (
                                <span className="text-ink">{optBullet || "—"}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Skills diff */}
      {(originalSkills.length > 0 || optimizedSkills.length > 0) && (
        <section>
          <h3 className="mb-3 border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate">
            Skills
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-red-100 bg-red-50/40 p-4">
              <p className="mb-2 text-xs font-semibold text-red-500 uppercase">Original</p>
              <div className="flex flex-wrap gap-2">
                {originalSkills.map((s) => (
                  <span key={s} className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs text-red-700">{s}</span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-green-100 bg-green-50/40 p-4">
              <p className="mb-2 text-xs font-semibold text-green-600 uppercase">Optimized</p>
              <div className="flex flex-wrap gap-2">
                {optimizedSkills.map((s) => (
                  <span key={s} className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs text-green-700">{s}</span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
