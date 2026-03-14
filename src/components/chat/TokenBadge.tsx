"use client";

function formatTokenCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function TokenBadge({
  tokenSum,
  loading = false,
}: {
  tokenSum: number | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-0)] bg-[color:var(--bg-1)] px-3 py-1.5 text-xs">
        <div className="h-1.5 w-1.5 rounded-full bg-[color:var(--text-2)]/40" />
        <div className="h-3 w-24 rounded bg-[color:var(--bg-3)]" />
      </div>
    );
  }

  if (tokenSum == null) return null;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-0)] bg-[color:var(--bg-1)] px-3 py-1.5 text-xs">
      <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--text-2)]/70" />
      <span className="font-medium text-[color:var(--text-0)]">
        {formatTokenCount(tokenSum)}
      </span>
      <span className="text-[color:var(--text-2)]">total tokens</span>
    </div>
  );
}