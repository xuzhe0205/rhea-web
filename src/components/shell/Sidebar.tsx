"use client";

export function Sidebar(props: { open: boolean; onClose: () => void }) {
  return (
    <>
      <div
        className={[
          "fixed inset-0 z-20 bg-black/40 transition-opacity md:hidden",
          props.open ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={props.onClose}
        aria-hidden="true"
      />

      <aside
        className={[
          "z-30 h-full w-[280px] shrink-0 border-r border-[color:var(--border-0)] bg-[color:var(--bg-1)]",
          "md:static md:translate-x-0",
          "fixed left-0 top-0 transition-transform md:transition-none",
          props.open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div className="flex h-14 items-center justify-between px-4">
            {/* RHEA + Index sublabel */}
            <div className="leading-tight">
              <div className="text-[13px] font-medium tracking-[0.18em] text-[color:var(--text-0)]">
                RHEA
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-2)]">
                Index
              </div>
            </div>

            <button
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border-0)] bg-[color:var(--bg-1)] text-[color:var(--text-0)] hover:bg-[color:var(--bg-3)] transition"
              onClick={props.onClose}
              aria-label="Close sidebar"
              title="Close sidebar"
            >
              <span className="text-[18px] leading-none">×</span>
            </button>
          </div>

          <div className="px-4 pb-2">
            <div className="h-px w-full bg-[color:var(--border-0)]" />
          </div>

          <nav className="flex-1 overflow-y-auto px-2 py-2">
            <SectionLabel>Conversations</SectionLabel>
            <NavItem active>RHEA Session</NavItem>
            <NavItem>Study: RAG notes</NavItem>
            <NavItem>Shared: Project plan</NavItem>

            <div className="h-4" />

            <SectionLabel>Notebook</SectionLabel>
            <NavItem>Favorites</NavItem>
            <NavItem>Notes</NavItem>
            <NavItem>Summaries</NavItem>

            <div className="h-4" />

            <SectionLabel>Agent</SectionLabel>
            <NavItem>Tasks (soon)</NavItem>
          </nav>

          {/* Profile bottom */}
          <div className="border-t border-[color:var(--border-0)] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-0)] bg-[color:var(--bg-2)] text-xs font-medium">
                OT
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm text-[color:var(--text-0)]">
                  Account
                </div>
                <div className="truncate text-xs text-[color:var(--text-2)]">
                  Settings & profile
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pb-1 pt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--text-2)]">
      {children}
    </div>
  );
}

function NavItem({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      className={[
        "relative flex w-full items-center rounded-[var(--radius-md)] px-3 py-2 text-left text-sm transition",
        "text-[color:var(--text-0)] hover:bg-[color:var(--bg-3)]",
        active ? "bg-[color:var(--bg-2)]" : "",
      ].join(" ")}
      type="button"
    >
      {active ? (
        <span className="absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-full border-l-2 border-[color:var(--accent)]" />
      ) : null}
      <span className="ml-1 truncate">{children}</span>
    </button>
  );
}