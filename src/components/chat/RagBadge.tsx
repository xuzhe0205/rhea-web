"use client";

import { useEffect, useRef, useState } from "react";
import type { RagStats } from "@/lib/chat-stream";

function formatScope(scope: string): string {
  if (scope === "conversation_only") return "Conversation";
  if (scope === "conversation_and_project") return "Project + Conv";
  if (scope === "project_only") return "Project";
  return scope;
}

function formatMode(mode: string): string {
  if (mode === "none") return "—";
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

const retrieved = (stats: RagStats) => stats.chunks_used > 0;

// ─── Component ────────────────────────────────────────────────────────────────

export function RagBadge({ stats }: { stats: RagStats }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const active = retrieved(stats);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {/* Badge pill */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-0)] bg-[color:var(--bg-1)] px-3 py-1.5 text-xs transition hover:border-[color:var(--text-2)]/30 hover:bg-[color:var(--bg-2)]"
        aria-label="RAG context details"
        title="RAG context"
      >
        <span
          className={[
            "h-1.5 w-1.5 shrink-0 rounded-full",
            active ? "bg-[color:var(--accent)]" : "bg-[color:var(--text-2)] opacity-40",
          ].join(" ")}
        />
        <span className="font-medium text-[color:var(--text-0)]">RAG</span>
        <span className="font-mono text-[color:var(--text-2)]">
          {active ? `· ${stats.top_score.toFixed(3)}` : "· —"}
        </span>
      </button>

      {/* Popup */}
      {open && (
        <div className="absolute bottom-full left-0 mb-2.5 z-30 w-[220px]">
          {/* Card */}
          <div className="rounded-[var(--radius-md)] border border-[color:var(--border-0)] bg-[color:var(--bg-2)] shadow-xl">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-[color:var(--border-0)] px-3 py-2.5">
              <span
                className={[
                  "h-2 w-2 shrink-0 rounded-full",
                  active ? "bg-[color:var(--accent)]" : "bg-[color:var(--text-2)] opacity-40",
                ].join(" ")}
              />
              <span className="text-xs font-semibold text-[color:var(--text-0)]">
                {active ? `${stats.chunks_used} chunk${stats.chunks_used !== 1 ? "s" : ""} retrieved` : "No context retrieved"}
              </span>
            </div>

            {/* Stats */}
            <div className="px-3 py-2.5 space-y-1.5">
              {active && (
                <>
                  <StatRow label="Top score" value={stats.top_score.toFixed(3)} />
                  <StatRow label="Avg score" value={stats.avg_score.toFixed(3)} />
                  <StatRow label="Mode" value={formatMode(stats.mode)} />
                </>
              )}
              <StatRow label="Scope" value={formatScope(stats.scope)} />
            </div>
          </div>

          {/* Tooltip arrow */}
          <div className="flex px-4">
            <div className="h-2 w-3 overflow-hidden">
              <div className="mx-auto h-2.5 w-2.5 origin-top-left rotate-45 border-b border-r border-[color:var(--border-0)] bg-[color:var(--bg-2)]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-[color:var(--text-2)]">{label}</span>
      <span className="font-mono text-[11px] text-[color:var(--text-1)]">{value}</span>
    </div>
  );
}
