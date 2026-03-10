"use client";

export function ModelBadge({ model }: { model: string }) {
  return (
    <div className="mb-2 flex items-center justify-start">
      <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-0)] bg-[color:var(--bg-1)] px-3 py-1.5 text-xs text-[color:var(--text-1)]">
        {/* small indicator dot */}
        <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]" />

        <span className="text-[color:var(--text-2)]">
          Using
        </span>

        <span className="font-medium text-[color:var(--text-0)]">
          {model}
        </span>
      </div>
    </div>
  );
}