import { ScanSearch } from "lucide-react";

interface BrandMarkProps {
  compact?: boolean;
}

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-9 place-items-center rounded-xl bg-ink text-lime shadow-[0_0_0_5px_rgba(203,255,91,0.18)]">
        <ScanSearch size={19} strokeWidth={2.5} />
      </div>
      {!compact && (
        <span className="font-display text-lg font-bold tracking-tight text-ink">
          Repo<span className="text-coral">Lens</span>
        </span>
      )}
    </div>
  );
}
