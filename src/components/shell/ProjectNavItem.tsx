"use client";

import * as React from "react";

type Props = {
  name: string;
  active?: boolean;
  onClick?: () => void;
};

export function ProjectNavItem({ name, active, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-left text-sm transition-all duration-150",
        "text-[color:var(--text-0)] select-none touch-manipulation",
        active ? "bg-[color:var(--bg-2)]" : "hover:bg-[color:var(--bg-3)]",
      ].join(" ")}
    >
      {active ? (
        <span className="absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-full border-l-2 border-[color:var(--accent)]" />
      ) : null}

      <ProjectIcon
        className={[
          "shrink-0 transition-colors duration-150",
          active ? "text-[color:var(--accent)]" : "text-[color:var(--text-2)] group-hover:text-[color:var(--text-1)]",
        ].join(" ")}
      />

      <span className="ml-0.5 min-w-0 flex-1 truncate">{name}</span>
    </button>
  );
}

function ProjectIcon({ className }: { className?: string }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect x="0.6" y="0.6" width="11.8" height="11.8" rx="2.4" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="6.5" cy="6.5" r="1.6" fill="currentColor" opacity="0.7" />
    </svg>
  );
}
