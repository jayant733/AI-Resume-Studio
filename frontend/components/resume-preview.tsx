import { ParsedResume } from "@/lib/types";

type GeneratedLike = Record<string, unknown>;

function getExperience(data: GeneratedLike | ParsedResume) {
  return (data.experience as Array<Record<string, unknown>> | undefined) || [];
}

function getSkills(data: GeneratedLike | ParsedResume) {
  return (data.skills as string[] | undefined) || [];
}

export function ResumePreview({
  parsedResume,
  generated
}: {
  parsedResume?: ParsedResume;
  generated?: GeneratedLike;
}) {
  const source = generated || parsedResume;
  if (!source) {
    return <div className="rounded-[28px] border border-dashed border-slate/30 p-8 text-sm text-slate">No resume data yet.</div>;
  }

  const contact = (source.contact as Record<string, string | null | undefined>) || {};
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-soft">
      <h2 className="text-3xl font-semibold text-ink">{String(source.name || "Candidate")}</h2>
      <p className="mt-2 text-sm text-slate">
        {[contact.email, contact.phone, contact.linkedin, contact.website].filter(Boolean).join(" | ")}
      </p>
      <div className="mt-8 space-y-6">
        <section>
          <h3 className="border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate">
            Professional Summary
          </h3>
          <p className="mt-3 text-sm leading-7 text-ink/90">{String(source.summary || "Summary will appear here.")}</p>
        </section>

        <section>
          <h3 className="border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate">
            Skills
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {getSkills(source).map((skill) => (
              <span key={skill} className="rounded-full bg-mist px-3 py-1 text-xs text-ink">
                {skill}
              </span>
            ))}
          </div>
        </section>

        <section>
          <h3 className="border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate">
            Experience
          </h3>
          <div className="mt-4 space-y-4">
            {getExperience(source).map((item, index) => (
              <article key={`${String(item.title)}-${index}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-ink">{String(item.title || "")}</p>
                    <p className="text-sm text-slate">{String(item.company || "")}</p>
                  </div>
                  <p className="text-xs text-slate">
                    {[item.start_date, item.end_date].filter(Boolean).map(String).join(" - ")}
                  </p>
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink/90">
                  {((item.bullets as string[] | undefined) || []).map((bullet, bulletIndex) => (
                    <li key={bulletIndex}>{bullet}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
