"use client";

import { useEffect, useRef, useState } from "react";
import { ParticipantsBadges } from "@/components/shell/ParticipantsBadges";

type Participant = { id: string; name: string };

export function Topbar(props: {
  title: string;
  label?: string;
  participants: Participant[];
  onOpenSidebar: () => void;
  onNewConversation?: () => void;
  selectionMode?: boolean;
  selectionCount?: number;
  onEnterSelectionMode?: () => void;
  onExitSelectionMode?: () => void;
}) {
  const showParticipants = props.participants.length > 2;
  const [moreOpen, setMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  function closeMore() { setMoreOpen(false); }

  useEffect(() => {
    if (!moreOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        closeMore();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [moreOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[color:var(--bg-0)] backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">

        {/* Left: burger (mobile) + title */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            className="md:hidden inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border-0)] bg-[color:var(--bg-1)] text-[color:var(--text-0)] hover:bg-[color:var(--bg-3)] transition"
            onClick={props.onOpenSidebar}
            aria-label="Open sidebar"
          >
            <span className="block h-3.5 w-4">
              <span className="block h-[1px] w-full bg-[color:var(--text-0)] opacity-80" />
              <span className="mt-[5px] block h-[1px] w-full bg-[color:var(--text-0)] opacity-80" />
              <span className="mt-[5px] block h-[1px] w-full bg-[color:var(--text-0)] opacity-80" />
            </span>
          </button>

          <div className="min-w-0">
            <div className="truncate text-sm text-[color:var(--text-1)]">
              {props.label ?? "Conversation"}
            </div>
            <div className="truncate text-[15px] font-medium text-[color:var(--text-0)]">
              {props.title}
            </div>
          </div>
        </div>

        {/* Desktop center wordmark */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 md:flex">
          <Wordmark />
        </div>

        {/* Right side */}
        <div className="flex shrink-0 items-center gap-2">
          {showParticipants && (
            <div className="hidden sm:block">
              <ParticipantsBadges participants={props.participants} />
            </div>
          )}

          {/* ── Desktop: Select button (icon + text) ── */}
          {!props.selectionMode && props.onEnterSelectionMode && (
            <button
              className="hidden md:inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] border border-[color:var(--border-0)] bg-[color:var(--bg-2)] px-3 text-sm text-[color:var(--text-0)] transition hover:bg-[color:var(--bg-3)] rhea-focus"
              onClick={props.onEnterSelectionMode}
              aria-label="Select messages"
            >
              <SelectIcon />
              Select
            </button>
          )}

          {/* ── Selection count indicator (read-only pill) ── */}
          {props.selectionMode && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--accent)]/12 px-2.5 py-1 text-[12px] font-medium text-[color:var(--accent)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]" aria-hidden="true" />
              {props.selectionCount ?? 0} selected
            </span>
          )}

          {/* ── Mobile: "…" menu (hidden when in selection mode) ── */}
          {!props.selectionMode && (
            <div ref={moreMenuRef} className="relative md:hidden">
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border-0)] bg-[color:var(--bg-2)] text-[color:var(--text-0)] transition hover:bg-[color:var(--bg-3)] rhea-focus"
                onClick={() => setMoreOpen((v) => !v)}
                aria-label="More options"
                aria-expanded={moreOpen}
              >
                <EllipsisIcon />
              </button>

              {moreOpen && (
                <div className="absolute right-0 top-full z-20 mt-1.5 w-52 overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--border-0)] bg-[color:var(--bg-1)] shadow-2xl">
                    {props.onNewConversation && (
                      <MenuRow
                        icon={<PlusIcon />}
                        label="New conversation"
                        onClick={() => { props.onNewConversation!(); closeMore(); }}
                      />
                    )}
                    {props.onEnterSelectionMode && (
                      <MenuRow
                        icon={<SelectIcon />}
                        label="Select messages"
                        onClick={() => { props.onEnterSelectionMode!(); closeMore(); }}
                      />
                    )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile participants row */}
      {showParticipants && (
        <div className="md:hidden -mt-1 pb-2">
          <div className="flex items-center justify-center">
            <Wordmark />
          </div>
          <div className="px-4 pt-1">
            <ParticipantsBadges participants={props.participants} />
          </div>
        </div>
      )}
    </header>
  );
}

// ─── Menu row ────────────────────────────────────────────────────────────────

function MenuRow({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 px-4 py-3 text-sm transition hover:bg-[color:var(--bg-2)] active:bg-[color:var(--bg-3)]",
        destructive ? "text-red-400" : "text-[color:var(--text-0)]",
      ].join(" ")}
    >
      <span className="opacity-70">{icon}</span>
      {label}
    </button>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function Wordmark() {
  return (
    <div className="select-none text-[13px] font-medium tracking-[0.18em] text-[color:var(--text-0)]" aria-label="RHEA">
      RHEA
    </div>
  );
}

function EllipsisIcon() {
  return (
    <svg width="16" height="4" viewBox="0 0 16 4" fill="currentColor" aria-hidden="true">
      <circle cx="2" cy="2" r="1.5" />
      <circle cx="8" cy="2" r="1.5" />
      <circle cx="14" cy="2" r="1.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SelectIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14.5 19l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
