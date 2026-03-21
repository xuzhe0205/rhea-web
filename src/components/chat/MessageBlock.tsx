"use client";

import { useEffect, useRef, useState } from "react";
import type { AnnotationDTO } from "@/lib/annotations";
import { AnnotatedMarkdownMessage } from "@/components/chat/richtext/AnnotatedMarkdownMessage";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  status?: "streaming" | "done" | "error";
};

const USER_COLLAPSED_MAX_HEIGHT = 160;

export function MessageBlock({
  msg,
  annotations,
  onCreateHighlight,
  onRemoveHighlightRange,
  onSelectionToolbarVisibleChange,
  mobileFooterOffset,
}: {
  msg: Msg;
  annotations: AnnotationDTO[];
  onCreateHighlight: (range: { start: number; end: number }) => Promise<void>;
  onRemoveHighlightRange: (range: { start: number; end: number }) => Promise<void>;
  onSelectionToolbarVisibleChange?: (visible: boolean) => void;
  mobileFooterOffset?: number;
}) {
  const isUser = msg.role === "user";
  const isStreaming = msg.status === "streaming";
  const isError = msg.status === "error";

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
  }, [isUser, msg.content, annotations]);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          isUser
            ? "ml-auto w-fit min-w-[180px] max-w-[88%] md:min-w-[220px] md:max-w-[620px]"
            : "w-full max-w-[96%] md:max-w-[820px]"
        }
      >
        <div
          className={[
            "mb-2 flex items-center text-[11px] font-medium uppercase tracking-[0.14em]",
            isUser
              ? "justify-end text-[color:var(--text-2)]"
              : "justify-start text-[color:var(--accent)]/80",
          ].join(" ")}
        >
          <span>{isUser ? "You" : "RHEA"}</span>

          {!isUser && isStreaming ? (
            <span className="ml-2 inline-flex items-center gap-1 normal-case tracking-normal text-[11px] text-[color:var(--text-2)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--accent)]" />
              responding
            </span>
          ) : null}
        </div>

        <div
          className={[
            "relative z-10 overflow-visible border transition",
            isUser
              ? [
                  "rounded-[24px] px-5 py-4",
                  "border-white/8",
                  "bg-[linear-gradient(180deg,rgba(30,38,58,0.92),rgba(25,31,47,0.96))]",
                  "shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]",
                ].join(" ")
              : [
                  "rounded-[var(--radius-lg)] px-5 py-4 pl-6",
                  isError ? "border-red-400/20" : "border-[color:var(--border-0)]",
                  "bg-[color:var(--bg-2)]",
                ].join(" "),
          ].join(" ")}
        >
          {!isUser ? (
            <span
              className="absolute bottom-4 left-0 top-4 w-[3px] rounded-full bg-[color:var(--accent)]"
              aria-hidden="true"
            />
          ) : null}

          <div className={isUser && isOverflowing && !expanded ? "relative" : ""}>
            <div
              ref={contentRef}
              className={[
                "break-words text-left",
                isUser && isOverflowing && !expanded ? "overflow-hidden" : "overflow-visible",
              ].join(" ")}
              style={
                isUser && isOverflowing && !expanded
                  ? { maxHeight: `${USER_COLLAPSED_MAX_HEIGHT}px` }
                  : undefined
              }
            >
              {msg.content ? (
                <AnnotatedMarkdownMessage
                  content={msg.content}
                  annotations={annotations}
                  onCreateHighlight={onCreateHighlight}
                  onRemoveHighlightRange={onRemoveHighlightRange}
                  onSelectionToolbarVisibleChange={onSelectionToolbarVisibleChange}
                  mobileFooterOffset={mobileFooterOffset}
                />
              ) : !isUser && isStreaming ? (
                <StreamingPlaceholder />
              ) : null}
            </div>

            {isUser && isOverflowing && !expanded ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 rounded-b-[24px] bg-gradient-to-t from-[rgba(25,31,47,0.98)] to-transparent" />
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
      <span className="h-2 w-2 animate-pulse rounded-full bg-[color:var(--accent)]" />
      <span>Thinking…</span>
    </div>
  );
}

function BlinkingCaret() {
  return (
    <span
      className="inline-block h-4 w-[7px] animate-pulse rounded-[2px] bg-[color:var(--accent)]"
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