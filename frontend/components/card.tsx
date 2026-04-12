import { ReactNode } from "react";

export function Card({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-soft backdrop-blur">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
