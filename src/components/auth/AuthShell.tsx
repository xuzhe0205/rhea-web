"use client";

import Link from "next/link";

export function AuthShell(props: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[color:var(--bg-0)] text-[color:var(--text-0)]">
      <div className="mx-auto grid min-h-dvh max-w-6xl grid-cols-1 md:grid-cols-2">
        {/* Left brand panel */}
        <div className="hidden border-r border-[color:var(--border-0)] bg-[color:var(--bg-0)] md:flex">
          <div className="flex w-full flex-col px-10 py-10">
            <div className="select-none">
              <div className="text-[12px] font-semibold tracking-[0.32em] text-[color:var(--text-2)]">
                RHEA
              </div>
              <div className="mt-1 text-[12px] uppercase tracking-[0.20em] text-[color:var(--text-1)]">
                INDEX
              </div>
            </div>

            <div className="mt-10">
              <div className="text-2xl font-medium leading-snug">
                A conversation that becomes a notebook.
              </div>
              <div className="mt-3 max-w-[48ch] text-sm text-[color:var(--text-1)]">
                Ask, annotate, favorite, and share. RHEA Index is designed for recursive learning
                and future-ready collaboration—without UI noise.
              </div>

              <div className="mt-8 space-y-3">
                <FeatureLine label="Notes on messages" />
                <FeatureLine label="Favorites & knowledge capture" />
                <FeatureLine label="Sharing + group threads (soon)" />
                <FeatureLine label="Agents as operators (future)" />
              </div>
            </div>

            <div className="mt-auto pt-10 text-xs text-[color:var(--text-2)]">
              Domain: <span className="text-[color:var(--text-1)]">rheaindex.com</span>
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex items-center justify-center px-4 py-10 md:px-10">
          <div className="w-full max-w-md">
            {/* Mobile wordmark */}
            <div className="mb-8 md:hidden">
              <div className="text-[12px] font-semibold tracking-[0.32em] text-[color:var(--text-2)]">
                RHEA
              </div>
              <div className="mt-1 text-[12px] uppercase tracking-[0.20em] text-[color:var(--text-1)]">
                INDEX
              </div>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-0)] bg-[color:var(--bg-1)] p-6">
              <div className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-2)]">
                {props.subtitle}
              </div>
              <div className="mt-2 text-xl font-medium">{props.title}</div>

              <div className="mt-5">{props.children}</div>
            </div>

            <div className="mt-4 text-sm text-[color:var(--text-1)]">{props.footer}</div>

            <div className="mt-8 flex items-center justify-between text-xs text-[color:var(--text-2)]">
              <Link className="hover:text-[color:var(--text-1)]" href="/">
                ← Back
              </Link>
              <span>RHEA Index</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureLine({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-[color:var(--text-1)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--border-0)]" />
      <span>{label}</span>
    </div>
  );
}