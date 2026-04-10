"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ImageStrip } from "@/components/chat/ImageStrip";
import { useImageAttach, MAX_IMAGES } from "@/hooks/useImageAttach";

type Participant = { id: string; name: string };

// ─── Component ────────────────────────────────────────────────────────────────

export function Composer({
  token,
  participants,
  onSend,
  disabled = false,
}: {
  token: string;
  participants: Participant[];
  onSend: (text: string, imageUrls?: string[], imageKeys?: string[]) => Promise<boolean>;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { images, readyUrls, readyKeys, addFiles, removeImage, clearAll } = useImageAttach(token);

  const atLimit = images.filter((i) => i.status !== "error").length >= MAX_IMAGES;
  const hasImages = images.length > 0;
  const activeImageCount = images.filter((i) => i.status !== "error").length;

  // ─── Mention autocomplete ─────────────────────────────────────────────────

  const mentionOptions = useMemo(() => {
    const rhea = participants.find((p) => p.id === "rhea");
    const rest = participants.filter((p) => p.id !== "rhea" && p.id !== "me");
    return [...(rhea ? [rhea] : []), ...rest].map((p) => ({
      id: p.id,
      label: `@${p.name.toLowerCase()}`,
      name: p.name,
    }));
  }, [participants]);

  function insertMention(label: string) {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const atPos = before.lastIndexOf("@");
    const newText =
      atPos >= 0
        ? before.slice(0, atPos) + label + " " + after
        : before + label + " " + after;
    setValue(newText);
    setMentionOpen(false);
    requestAnimationFrame(() => {
      const pos = (atPos >= 0 ? atPos : start) + label.length + 1;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  // ─── Error display ────────────────────────────────────────────────────────

  function showError(msg: string) {
    setValidationError(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setValidationError(null), 5000);
  }

  // ─── File handling ────────────────────────────────────────────────────────

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (arr.length === 0) return;
      const errors = await addFiles(arr);
      if (errors.length > 0) showError(errors[0]);
    },
    [addFiles],
  );

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  // ─── Send ─────────────────────────────────────────────────────────────────

  async function submit() {
    const trimmed = value.trim();
    const hasContent = trimmed.length > 0 || readyUrls.length > 0;
    if (!hasContent || disabled) return;

    const urls = readyUrls.length > 0 ? readyUrls : undefined;
    const keys = readyKeys.length > 0 ? readyKeys : undefined;
    // Clear immediately — content is captured above, images appear in the optimistic bubble
    setValue("");
    setMentionOpen(false);
    clearAll();
    await onSend(trimmed, urls, keys);
  }

  // ─── Keyboard ─────────────────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, mentionOptions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const opt = mentionOptions[activeIdx];
        if (opt) insertMention(opt.label);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setMentionOpen(false);
      }
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  function handleChange(v: string) {
    setValue(v);
    const el = inputRef.current;
    const caret = el?.selectionStart ?? v.length;
    const before = v.slice(0, caret);
    const lastAt = before.lastIndexOf("@");
    const shouldOpen =
      lastAt >= 0 && (lastAt === 0 || /\s/.test(before[lastAt - 1] ?? " "));
    setMentionOpen(shouldOpen);
    if (shouldOpen) setActiveIdx(0);
  }

  // ─── Paste ────────────────────────────────────────────────────────────────

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const files = e.clipboardData?.files;
    if (files && files.length > 0) {
      const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (images.length > 0) {
        e.preventDefault();
        void handleFiles(images);
      }
    }
  }

  // ─── Drag & drop ──────────────────────────────────────────────────────────

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    const hasImageFiles = Array.from(e.dataTransfer.items).some(
      (item) => item.kind === "file" && item.type.startsWith("image/"),
    );
    if (hasImageFiles) setIsDraggingOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear if truly leaving the composer area
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files.length > 0) {
      void handleFiles(e.dataTransfer.files);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const canSend = !disabled && (value.trim().length > 0 || readyUrls.length > 0);

  return (
    <div className="relative">
      {/* Mention popup */}
      {mentionOpen && !disabled && mentionOptions.length > 0 && (
        <div className="absolute bottom-[calc(100%+10px)] left-0 w-full rounded-[var(--radius-lg)] border border-[color:var(--border-0)] bg-[color:var(--bg-2)] p-1 shadow-xl">
          <div className="px-2 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--text-2)]">
            Mention
          </div>
          {mentionOptions.map((opt, idx) => (
            <button
              key={opt.id}
              type="button"
              className={[
                "flex w-full items-center justify-between rounded-[var(--radius-md)] px-2 py-2 text-left text-sm transition",
                idx === activeIdx
                  ? "bg-[color:var(--bg-3)] text-[color:var(--text-0)]"
                  : "text-[color:var(--text-1)] hover:bg-[color:var(--bg-3)] hover:text-[color:var(--text-0)]",
              ].join(" ")}
              onMouseEnter={() => setActiveIdx(idx)}
              onMouseDown={(e) => { e.preventDefault(); insertMention(opt.label); }}
            >
              <span className="font-medium">{opt.label}</span>
              <span className="text-xs text-[color:var(--text-2)]">{opt.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* File input — visually hidden but NOT display:none, which causes Chrome to hang on programmatic .click() */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        style={{ position: "fixed", top: "-9999px", left: "-9999px", opacity: 0 }}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          if (e.target.files) void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Main composer shell */}
      <div
        className={[
          "rounded-[var(--radius-lg)] border bg-[color:var(--bg-1)] transition-colors duration-150",
          isDraggingOver
            ? "border-[color:var(--accent)]/60 bg-[color:var(--accent)]/5"
            : "border-[color:var(--border-0)]",
        ].join(" ")}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Image strip — above textarea, inside the border */}
        {hasImages && (
          <ImageStrip images={images} onRemove={removeImage} />
        )}

        {/* Input row */}
        <div className="flex items-end gap-1.5 p-2">
          {/* Attach button */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={openFilePicker}
              disabled={disabled || atLimit}
              aria-label="Attach images"
              title={atLimit ? "Image limit reached (10)" : "Attach images"}
              className={[
                "rhea-focus flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)]",
                "text-[color:var(--text-2)] transition",
                disabled || atLimit
                  ? "cursor-not-allowed opacity-35"
                  : "hover:bg-[color:var(--bg-3)] hover:text-[color:var(--text-1)]",
              ].join(" ")}
            >
              <ImageIcon />
            </button>
            {/* Image count badge */}
            {activeImageCount > 0 && (
              <span className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--accent)] px-0.5 font-mono text-[9px] leading-none text-white">
                {activeImageCount}
              </span>
            )}
          </div>

          {/* Textarea */}
          <textarea
            ref={inputRef}
            disabled={disabled}
            className="rhea-focus min-h-[44px] max-h-[160px] flex-1 resize-none rounded-[var(--radius-md)] border border-transparent bg-transparent px-2 py-2.5 text-[16px] leading-6 text-[color:var(--text-0)] placeholder:text-[color:var(--text-2)] disabled:cursor-not-allowed disabled:opacity-60"
            placeholder={
              isDraggingOver
                ? "Drop images here…"
                : disabled
                ? "RHEA is responding…"
                : "Ask RHEA… (type @ to mention)"
            }
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
          />

          {/* Send button */}
          <button
            className="rhea-focus inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--accent)] text-white transition hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-35 shrink-0"
            type="button"
            onClick={() => void submit()}
            disabled={!canSend}
            aria-label="Send"
            title="Send"
          >
            <SendIcon />
          </button>
        </div>
      </div>

      {/* Validation error banner */}
      {validationError && (
        <div className="mt-2 flex items-start gap-2 rounded-[var(--radius-md)] border border-red-500/20 bg-red-500/8 px-3 py-2">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-red-400">
            <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M6.5 4v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="6.5" cy="9" r="0.65" fill="currentColor" />
          </svg>
          <span className="text-xs leading-relaxed text-red-400">{validationError}</span>
          <button
            type="button"
            onClick={() => setValidationError(null)}
            className="ml-auto shrink-0 text-red-400/60 hover:text-red-400 transition"
            aria-label="Dismiss"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Footer hint */}
      <div className="mt-2 flex items-center justify-between text-xs text-[color:var(--text-2)]">
        <span>
          {disabled
            ? "Streaming response…"
            : hasImages
            ? `${activeImageCount}/10 images · Enter to send`
            : "Enter to send · Shift+Enter for newline · ⌘V to paste image"}
        </span>
        <span className="hidden sm:inline">RHEA Index</span>
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ImageIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
      <rect x="1.5" y="3" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="6" cy="7" r="1.2" fill="currentColor" opacity="0.7" />
      <path
        d="M1.5 11.5l3.5-3.5 2.5 2.5 2.5-2.5 4 4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path
        d="M13 7.5L2 2l2.5 5.5L2 13l11-5.5z"
        fill="currentColor"
        strokeLinejoin="round"
      />
    </svg>
  );
}
