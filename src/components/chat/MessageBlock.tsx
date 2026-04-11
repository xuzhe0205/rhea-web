"use client";

import { useEffect, useRef, useState } from "react";
import type { AnnotationDTO } from "@/lib/annotations";
import type { CommentThreadDTO } from "@/lib/comments";
import { AnnotatedMarkdownMessage } from "@/components/chat/richtext/AnnotatedMarkdownMessage";
import { BookmarkIcon } from "@/components/ui/BookmarkIcon";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  status?: "streaming" | "done" | "error";
  imageUrls?: string[];
};

const USER_COLLAPSED_MAX_HEIGHT = 160;

export function MessageBlock({
  msg,
  annotations,
  commentThreads,
  isFavorite,
  favoriteBusy,
  onToggleFavorite,
  onCreateHighlight,
  onRemoveHighlightRange,
  onCreateComment,
  onOpenCommentThread,
  onSelectionToolbarVisibleChange,
  onShare,
  mobileFooterOffset,
  selectionMode,
  isSelected,
  onToggleSelect,
}: {
  msg: Msg;
  annotations: AnnotationDTO[];
  commentThreads: CommentThreadDTO[];
  isFavorite?: boolean;
  favoriteBusy?: boolean;
  onToggleFavorite?: () => void;
  onCreateHighlight: (range: { start: number; end: number }) => Promise<void>;
  onRemoveHighlightRange: (range: { start: number; end: number }) => Promise<void>;
  onCreateComment: (
    range: { start: number; end: number },
    selectedTextSnapshot: string,
  ) => Promise<void>;
  onOpenCommentThread: (threadId: string) => void;
  onSelectionToolbarVisibleChange?: (visible: boolean) => void;
  onShare?: () => void;
  mobileFooterOffset?: number;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
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
  }, [isUser, msg.content, annotations, commentThreads]);

  return (
    <div
      className={[
        "group flex",
        selectionMode
          ? "items-center cursor-pointer select-none"
          : isUser ? "justify-end" : "justify-start",
      ].join(" ")}
      onClick={selectionMode ? onToggleSelect : undefined}
    >
      {/* Selection checkbox */}
      {selectionMode && (
        <div
          className="mr-3 flex-shrink-0 self-center"
          onClick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}
        >
          <SelectionCircle selected={!!isSelected} />
        </div>
      )}
      <div
        className={[
          isUser
            ? "w-fit min-w-[180px] max-w-[88%] md:min-w-[220px] md:max-w-[620px]"
            : "w-full max-w-[96%] md:max-w-[820px]",
          selectionMode && isUser ? "ml-auto" : "",
        ].join(" ")}
      >
        <div
          className={[
            "mb-2 flex items-center justify-between gap-3",
            isUser ? "text-[color:var(--text-2)]" : "text-[color:var(--accent)]/80",
          ].join(" ")}
        >
          <div
            className={[
              "flex min-w-0 items-center text-[11px] font-medium uppercase tracking-[0.14em]",
              isUser ? "justify-end" : "justify-start",
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
        </div>

        <div
          className={[
            "relative z-10 overflow-visible transition",
            isUser
              ? [
                  "rounded-2xl px-5 py-4",
                  isSelected ? "ring-1 ring-[color:var(--accent)]/50" : "",
                  "bg-[color:var(--bg-2)]",
                ].join(" ")
              : [
                  "rounded-[var(--radius-lg)] px-5 py-4 pl-6",
                  isError
                    ? "bg-red-400/[0.05]"
                    : isSelected
                    ? "bg-[color:var(--accent)]/[0.06]"
                    : "bg-[color:var(--bg-2)]",
                ].join(" "),
          ].join(" ")}
        >
          {/* Selection overlay — captures clicks inside the bubble in selection mode */}
          {selectionMode && (
            <div
              className="absolute inset-0 z-20 rounded-[inherit]"
              aria-hidden="true"
              onClick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}
            />
          )}
          {!isUser ? (
            <span
              className="absolute bottom-4 left-0 top-4 w-[3px] rounded-full bg-[color:var(--accent)]"
              aria-hidden="true"
            />
          ) : null}

          {/* Attached images — shown above text for user messages */}
          {isUser && msg.imageUrls && msg.imageUrls.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {msg.imageUrls.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt={`Attached image ${i + 1}`}
                  className="h-40 max-w-[220px] rounded-2xl object-cover"
                  draggable={false}
                />
              ))}
            </div>
          )}

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
                  commentThreads={commentThreads}
                  onCreateHighlight={onCreateHighlight}
                  onRemoveHighlightRange={onRemoveHighlightRange}
                  onCreateComment={onCreateComment}
                  onOpenCommentThread={onOpenCommentThread}
                  onSelectionToolbarVisibleChange={onSelectionToolbarVisibleChange}
                  mobileFooterOffset={mobileFooterOffset}
                />
              ) : !isUser && isStreaming ? (
                <StreamingPlaceholder />
              ) : null}
            </div>

            {isUser && isOverflowing && !expanded ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 rounded-b-2xl bg-gradient-to-t from-[rgba(21,24,33,0.98)] to-transparent" />
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
                className="rhea-focus inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-0)] bg-[color:var(--bg-2)] px-2.5 py-1.5 text-xs text-[color:var(--text-1)] transition hover:bg-[color:var(--bg-3)] hover:text-[color:var(--text-0)]"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
              >
                <span>{expanded ? "Show less" : "Show more"}</span>
                <ChevronIcon expanded={expanded} />
              </button>
            </div>
          ) : null}
        </div>

        {/* Action row — below the bubble, unambiguously tied to this message */}
        {!selectionMode && !isStreaming && (
          <div className={[
            "mt-1.5 flex items-center gap-0.5",
            isUser ? "justify-end" : "justify-start pl-1",
          ].join(" ")}>
            {onShare && (
              <button
                type="button"
                aria-label="Share message"
                title="Share message"
                onClick={onShare}
                className={[
                  "inline-flex h-7 w-7 items-center justify-center rounded-lg",
                  "text-[color:var(--text-2)] transition cursor-pointer",
                  "hover:bg-[color:var(--bg-3)] hover:text-[color:var(--text-0)] active:scale-[0.97]",
                ].join(" ")}
              >
                <ShareIcon />
              </button>
            )}
            <button
              type="button"
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
              disabled={favoriteBusy}
              onClick={onToggleFavorite}
              className={[
                "inline-flex h-7 w-7 items-center justify-center rounded-lg",
                "transition cursor-pointer",
                "hover:bg-[color:var(--bg-3)] active:scale-[0.97]",
                "disabled:cursor-not-allowed disabled:opacity-60",
                isFavorite
                  ? "text-[color:var(--accent)]"
                  : "text-[color:var(--text-2)]",
              ].join(" ")}
            >
              <BookmarkIcon filled={isFavorite} busy={favoriteBusy} />
            </button>
          </div>
        )}
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

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="11" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="11" cy="11.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="2.5" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 7l5.5-3.5M4 7l5.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function SelectionCircle({ selected }: { selected: boolean }) {
  return (
    <div
      className={[
        "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-150",
        selected
          ? "border-[color:var(--accent)] bg-[color:var(--accent)]"
          : "border-[color:var(--border-0)] bg-transparent",
      ].join(" ")}
    >
      {selected && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
          <path
            d="M1 4l3 3 5-6"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
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
