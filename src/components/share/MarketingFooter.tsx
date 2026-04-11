"use client";

import { useState } from "react";

export function MarketingFooter() {
  const [expanded, setExpanded] = useState(false);

  return (
    <footer className="sticky bottom-0 z-30 border-t border-[color:var(--border-0)] bg-[color:var(--bg-0)]/95 backdrop-blur-sm">
      {/* Toggle handle */}
      <style>{`
        @keyframes rhea-breathe {
          0%, 100% { opacity: 0.35; }
          50%       { opacity: 1;    }
        }
        .rhea-footer-prompt {
          animation: rhea-breathe 3s ease-in-out infinite;
        }
      `}</style>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse" : "What is RHEA?"}
        className="flex w-full flex-col items-center justify-center py-2.5 md:py-4 text-[color:var(--text-2)] transition hover:text-[color:var(--text-1)]"
      >
        {expanded ? (
          <WideChevron expanded={expanded} />
        ) : (
          <div className="rhea-footer-prompt flex flex-col items-center gap-1.5">
            <WideChevron expanded={expanded} />
            <span className="text-[12px]">What is RHEA?</span>
          </div>
        )}
      </button>

      {/* Expandable panel */}
      <div
        className={[
          "overflow-hidden transition-all duration-300 ease-in-out",
          expanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0",
        ].join(" ")}
        aria-hidden={!expanded}
      >
        <div className="px-4 pb-7 pt-2 md:px-8">
          <div className="mx-auto max-w-2xl">
            {/* Feature grid: 2-col on mobile, 4-col on md+ */}
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
              <FeatureItem
                icon={<ChatIcon />}
                label="Persistent memory"
                description="Remembers context across every conversation so you never have to repeat yourself."
              />
              <FeatureItem
                icon={<FolderIcon />}
                label="Projects"
                description="Group conversations into workspaces to keep research and work neatly organized."
              />
              <FeatureItem
                icon={<BookmarkIcon />}
                label="Favorites & notes"
                description="Bookmark responses, highlight passages, and annotate anything worth keeping."
              />
              <FeatureItem
                icon={<RobotIcon />}
                label="AI agents"
                description="Automate multi-step research, analysis, and writing tasks end to end."
              />
            </div>

            {/* CTA */}
            <div className="flex flex-col items-center gap-3">
              <a
                href="/signup"
                className="rounded-[var(--radius-lg)] bg-[color:var(--accent)] px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 active:opacity-80"
              >
                Create a free account →
              </a>
              <p className="text-[10px] text-[color:var(--text-2)]">rheaindex.com</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FeatureItem({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--border-0)] bg-[color:var(--bg-2)] text-[color:var(--accent)]">
        {icon}
      </div>
      <p className="text-[11px] font-semibold text-[color:var(--text-1)]">{label}</p>
      <p className="text-[11px] leading-relaxed text-[color:var(--text-2)]">{description}</p>
    </div>
  );
}

// ─── Toggle chevron ────────────────────────────────────────────────────────────

function WideChevron({ expanded }: { expanded: boolean }) {
  // expanded → show ∨ (click to collapse)
  // collapsed → show ∧ (click to expand)
  return (
    <svg
      width="36"
      height="14"
      viewBox="0 0 36 14"
      fill="none"
      aria-hidden="true"
      className="transition-transform duration-300"
    >
      {expanded ? (
        // ∨ downward
        <path
          d="M2 2l16 10L34 2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        // ∧ upward
        <path
          d="M2 12L18 2l16 10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

// ─── Feature icons ─────────────────────────────────────────────────────────────

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="11" r="1" fill="currentColor" />
      <circle cx="12" cy="11" r="1" fill="currentColor" />
      <circle cx="15" cy="11" r="1" fill="currentColor" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="9"
        y1="10"
        x2="15"
        y2="10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RobotIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Antenna */}
      <line x1="12" y1="8" x2="12" y2="5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="4" r="1.2" fill="currentColor" />
      {/* Head */}
      <rect x="4" y="8" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      {/* Eyes */}
      <circle cx="9" cy="13" r="1.5" fill="currentColor" />
      <circle cx="15" cy="13" r="1.5" fill="currentColor" />
      {/* Mouth */}
      <path d="M9 17h2m2 0h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
