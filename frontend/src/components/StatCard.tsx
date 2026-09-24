interface StatCardProps {
  label: string;
  value: string | number;
  detail?: string;
}

export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <div className="border-l-2 border-lime bg-white/70 px-4 py-3">
      <div className="font-display text-2xl font-bold text-ink">{value}</div>
      <div className="text-xs font-bold uppercase tracking-[0.13em] text-muted">
        {label}
      </div>
      {detail && <div className="mt-1 text-xs text-muted">{detail}</div>}
    </div>
  );
}
