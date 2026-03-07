"use client";

import { useEffect, useRef, useState } from "react";
import { MarkdownMessage } from "@/components/chat/MarkdownMessage";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  status?: "streaming" | "done" | "error";
};

const USER_COLLAPSED_MAX_HEIGHT = 160;

export function MessageBlock({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  const isStreaming = msg.status === "streaming";
  const isError = msg.status === "error";

  const containerAlign = isUser ? "justify-end" : "justify-start";
  const blockBg = isUser
    ? "var(--bg-3)"
    : isError
    ? "rgba(120,30,30,0.22)"
    : "var(--bg-2)";

  const contentRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    if (!isUser) return;

    const el = contentRef.current;
    if (!el) return;

    const checkOverflow = () => {
      setIsOverflowing(el.scrollHeight > USER_COLLAPSED_MAX_HEIGHT + 4);
    };

    checkOverflow();

    const ro = new ResizeObserver(() => checkOverflow());
    ro.observe(el);

    return () => ro.disconnect();
  }, [isUser, msg.content]);

  return (
    <div className={`flex ${containerAlign}`}>
      <div className={isUser ? "w-full max-w-[760px]" : "w-full max-w-[720px]"}>
        <div
          className={[
            "mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em]",
            isUser
              ? "justify-end text-[color:var(--text-2)]"
              : "text-[color:var(--text-2)]",
          ].join(" ")}
        >
          <span>{isUser ? "You" : "RHEA"}</span>
          {!isUser && isStreaming ? (
            <span className="inline-flex items-center gap-1 normal-case tracking-normal text-[11px] text-[color:var(--text-2)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)] animate-pulse" />
              responding
            </span>
          ) : null}
        </div>

        <div
          className={[
            "relative rounded-[var(--radius-lg)] border border-[color:var(--border-0)] px-4 py-3",
            isUser ? "" : "pl-5",
          ].join(" ")}
          style={{ background: blockBg }}
        >
          {!isUser ? (
            <span
              className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-[color:var(--accent)]"
              aria-hidden="true"
            />
          ) : null}

          <div className={isUser && isOverflowing && !expanded ? "relative" : ""}>
            <div
              ref={contentRef}
              className="overflow-hidden"
              style={
                isUser && isOverflowing && !expanded
                  ? { maxHeight: `${USER_COLLAPSED_MAX_HEIGHT}px` }
                  : undefined
              }
            >
              {msg.content ? (
                <MarkdownMessage content={msg.content} />
              ) : !isUser && isStreaming ? (
                <StreamingPlaceholder />
              ) : null}
            </div>

            {isUser && isOverflowing && !expanded ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 rounded-b-[var(--radius-lg)] bg-gradient-to-t from-[color:var(--bg-3)] to-transparent" />
            ) : null}
          </div>

          {!isUser && isStreaming && msg.content ? (
            <div className="mt-2">
              <BlinkingCaret />
            </div>
          ) : null}

          {isUser && isOverflowing ? (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                className="rhea-focus inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-0)] bg-[color:var(--bg-0)] px-2.5 py-1.5 text-xs text-[color:var(--text-1)] transition hover:bg-[color:var(--bg-1)] hover:text-[color:var(--text-0)]"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
              >
                <span>{expanded ? "Show less" : "Show more"}</span>
                <ChevronIcon expanded={expanded} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StreamingPlaceholder() {
  return (
    <div className="flex items-center gap-2 text-sm text-[color:var(--text-2)]">
      <span className="h-2 w-2 rounded-full bg-[color:var(--accent)] animate-pulse" />
      <span>Thinking…</span>
    </div>
  );
}

function BlinkingCaret() {
  return (
    <span
      className="inline-block h-4 w-[7px] rounded-[2px] bg-[color:var(--accent)] animate-pulse"
      aria-hidden="true"
    />
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={expanded ? "rotate-180" : ""}
    >
      <path
        d="M6 9l6 6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}