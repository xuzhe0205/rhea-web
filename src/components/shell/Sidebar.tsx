"use client";

import Image from "next/image";
import Link from "next/link";

type Conversation = { id: string; title: string; updatedAt?: string };

export function Sidebar(props: {
  open: boolean;
  onClose: () => void;

  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;

  onCreateConversation: () => void;
}) {
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
          <div className="flex h-16 items-center justify-between px-4">
            <Link
              href="/"
              onClick={props.onClose}
              className="flex items-center gap-3 cursor-pointer select-none"
              aria-label="Go to home"
            >
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[10px] border border-[color:var(--border-0)] bg-[color:var(--bg-2)]">
                <Image
                  src="/rhea-logo.png"
                  alt="RHEA Index"
                  fill
                  className="object-contain"
                  priority
                />
              </div>

              <div className="leading-tight">
                <div className="text-[13px] font-medium tracking-[0.18em] text-[color:var(--text-0)]">
                  RHEA
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-2)]">
                  Index
                </div>
              </div>
            </Link>

            <button
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border-0)] bg-[color:var(--bg-1)] text-[color:var(--text-0)] hover:bg-[color:var(--bg-3)] transition cursor-pointer"
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
            <SectionHeader label="Conversations" />
            <div className="space-y-1">
              {props.conversations.length === 0 ? (
                <div className="px-2 py-2 text-xs text-[color:var(--text-2)]">
                  No conversations yet.
                </div>
              ) : (
                props.conversations.map((c) => (
                  <NavItem
                    key={c.id}
                    active={props.activeConversationId === c.id}
                    onClick={() => props.onSelectConversation(c.id)}
                  >
                    {c.title}
                  </NavItem>
                ))
              )}
            </div>

            <div className="mt-2">
              <ActionRowButton onClick={props.onCreateConversation}>
                <PlusIcon />
                <span>New</span>
              </ActionRowButton>
            </div>

            <div className="h-4" />

            <SectionHeader label="Projects" soon />
            <div className="px-2 py-2 text-xs text-[color:var(--text-2)]">
              Coming soon.
            </div>

            <div className="h-4" />

            <SectionHeader label="Favorites" />
            <div className="px-2 py-2 text-xs text-[color:var(--text-2)]">
              Star a chat to pin it here.
            </div>

            <div className="h-4" />

            <SectionHeader label="Agent" />
            <NavItem disabled>Tasks (soon)</NavItem>
            <NavItem disabled>Research Operator (soon)</NavItem>
          </nav>

          {/* Profile bottom */}
          <div className="border-t border-[color:var(--border-0)] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-0)] bg-[color:var(--bg-2)] text-xs font-medium">
                N
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm text-[color:var(--text-0)] select-text">
                  Account
                </div>
                <div className="truncate text-xs text-[color:var(--text-2)] select-text">
                  Settings &amp; profile
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function SectionHeader({ label, soon }: { label: string; soon?: boolean }) {
  return (
    <div className="flex items-center justify-between px-2 pb-1 pt-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--text-2)]">
        {label}
      </div>
      {soon ? (
        <div className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-2)] opacity-70">
          soon
        </div>
      ) : null}
    </div>
  );
}

function NavItem(props: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const disabled = !!props.disabled;

  return (
    <button
      className={[
        "relative flex w-full items-center rounded-[var(--radius-md)] px-3 py-2 text-left text-sm transition",
        "text-[color:var(--text-0)]",
        disabled
          ? "cursor-not-allowed opacity-45"
          : "cursor-pointer hover:bg-[color:var(--bg-3)]",
        props.active ? "bg-[color:var(--bg-2)]" : "",
      ].join(" ")}
      type="button"
      onClick={disabled ? undefined : props.onClick}
    >
      {props.active ? (
        <span className="absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-full border-l-2 border-[color:var(--accent)]" />
      ) : null}
      <span className="ml-1 truncate select-text">{props.children}</span>
    </button>
  );
}

function ActionRowButton(props: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="inline-flex w-full cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[color:var(--text-1)] transition hover:bg-[color:var(--bg-3)] hover:text-[color:var(--text-0)]"
    >
      {props.children}
    </button>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}