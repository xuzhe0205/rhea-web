"use client";

import { ParticipantsBadges } from "@/components/shell/ParticipantsBadges";

type Participant = { id: string; name: string };

export function Topbar(props: {
  title: string;
  participants: Participant[];
  onOpenSidebar: () => void;
  onNewConversation?: () => void;
}) {
  const showParticipants = props.participants.length > 2;

  return (
    <header className="sticky top-0 z-10 border-b border-[color:var(--border-0)] bg-[color:var(--bg-0)]">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        {/* Left: burger on mobile + title */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border-0)] bg-[color:var(--bg-1)] text-[color:var(--text-0)] hover:bg-[color:var(--bg-3)] transition"
            onClick={props.onOpenSidebar}
            aria-label="Open sidebar"
            title="Open sidebar"
          >
            <span className="block h-3.5 w-4">
              <span className="block h-[1px] w-full bg-[color:var(--text-0)] opacity-80" />
              <span className="mt-[5px] block h-[1px] w-full bg-[color:var(--text-0)] opacity-80" />
              <span className="mt-[5px] block h-[1px] w-full bg-[color:var(--text-0)] opacity-80" />
            </span>
          </button>

          <div className="min-w-0">
            <div className="truncate text-sm text-[color:var(--text-1)]">
              Conversation
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
        <div className="flex items-center gap-3">

          {/* Only show if >1 participants */}
          {showParticipants && (
            <div className="hidden sm:block">
              <ParticipantsBadges participants={props.participants} />
            </div>
          )}

          {/* Mobile new conversation button */}
          {props.onNewConversation && (
            <button
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border-0)] bg-[color:var(--bg-1)] text-[color:var(--text-0)] hover:bg-[color:var(--bg-3)] transition rhea-focus"
              onClick={props.onNewConversation}
              aria-label="New conversation"
              title="New conversation"
            >
              <PlusIcon />
            </button>
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

function Wordmark() {
  return (
    <div
      className="select-none text-[13px] font-medium tracking-[0.18em] text-[color:var(--text-0)]"
      aria-label="RHEA"
    >
      RHEA
    </div>
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