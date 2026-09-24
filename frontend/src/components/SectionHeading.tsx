import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function SectionHeading({
  eyebrow,
  title,
  icon,
  action,
}: SectionHeadingProps) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-coral">
          {icon}
          {eyebrow}
        </div>
        <h2 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}
