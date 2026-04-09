"use client";

import { useCallback, useRef, useState } from "react";
import { ImageStrip } from "@/components/chat/ImageStrip";
import { useImageAttach, MAX_IMAGES } from "@/hooks/useImageAttach";

type Props = {
  token: string;
  onSubmit: (message: string, imageUrls?: string[]) => Promise<void>;
};

export function ThreadComposer({ token, onSubmit }: Props) {
  const [draft, setDraft] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { images, readyUrls, addFiles, removeImage, clearAll } = useImageAttach(token);

  const atLimit = images.filter((i) => i.status !== "error").length >= MAX_IMAGES;
  const activeImageCount = images.filter((i) => i.status !== "error").length;
  const hasImages = images.length > 0;
  const canSubmit = !starting && (draft.trim().length > 0 || readyUrls.length > 0);

  function showValidationError(msg: string) {
    setValidationError(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setValidationError(null), 5000);
  }

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (arr.length === 0) return;
      const errors = await addFiles(arr);
      if (errors.length > 0) showValidationError(errors[0]);
    },
    [addFiles],
  );

  async function handleSubmit() {
    const trimmed = draft.trim();
    if (!canSubmit) return;
    setStarting(true);
    setError(null);
    try {
      const urls = readyUrls.length > 0 ? readyUrls : undefined;
      // Clear immediately — content is captured above
      setDraft("");
      clearAll();
      await onSubmit(trimmed, urls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start thread.");
    } finally {
      setStarting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const files = e.clipboardData?.files;
    if (files && files.length > 0) {
      const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (imgs.length > 0) {
        e.preventDefault();
        void handleFiles(imgs);
      }
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    const hasImageFiles = Array.from(e.dataTransfer.items).some(
      (item) => item.kind === "file" && item.type.startsWith("image/"),
    );
    if (hasImageFiles) setIsDraggingOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files.length > 0) void handleFiles(e.dataTransfer.files);
  }

  return (
    <div>
      <div
        className={[
          "rounded-[var(--radius-lg)] border bg-[color:var(--bg-1)] transition-colors duration-150",
          isDraggingOver
            ? "border-[color:var(--accent)]/60 bg-[color:var(--accent)]/5"
            : "border-[color:var(--border-0)] focus-within:border-[color:var(--accent)]/40",
        ].join(" ")}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Image strip */}
        {hasImages && <ImageStrip images={images} onRemove={removeImage} />}

        {/* Textarea */}
        <div className="px-4 pt-4 pb-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={isDraggingOver ? "Drop images here…" : "Start a new thread in this project…"}
            rows={3}
            disabled={starting}
            className="w-full resize-none bg-transparent text-[16px] md:text-sm leading-relaxed text-[color:var(--text-0)] placeholder:text-[color:var(--text-2)] focus:outline-none disabled:opacity-60"
          />
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          <div className="flex items-center gap-1">
            {/* Attach button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={starting || atLimit}
                aria-label="Attach images"
                title={atLimit ? "Image limit reached (10)" : "Attach images"}
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)]",
                  "text-[color:var(--text-2)] transition",
                  starting || atLimit
                    ? "cursor-not-allowed opacity-35"
                    : "hover:bg-[color:var(--bg-3)] hover:text-[color:var(--text-1)]",
                ].join(" ")}
              >
                <ImageIcon />
              </button>
              {activeImageCount > 0 && (
                <span className="pointer-events-none absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[color:var(--accent)] px-0.5 font-mono text-[8px] leading-none text-white">
                  {activeImageCount}
                </span>
              )}
            </div>

            <span className="text-xs text-[color:var(--text-2)]">
              {hasImages ? `${activeImageCount}/10 images` : "Threads here share project context."}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className={[
              "flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium transition",
              "bg-[color:var(--accent)] text-white hover:opacity-90 active:opacity-80",
              "disabled:opacity-30 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            {starting ? "Starting…" : (
              <>
                Start thread
                <ArrowIcon />
              </>
            )}
          </button>
        </div>
      </div>

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

      {/* Validation error */}
      {validationError && (
        <div className="mt-2 flex items-start gap-2 rounded-[var(--radius-md)] border border-red-500/20 bg-red-500/8 px-3 py-2">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-red-400">
            <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M6.5 4v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="6.5" cy="9" r="0.65" fill="currentColor" />
          </svg>
          <span className="text-xs leading-relaxed text-red-400">{validationError}</span>
        </div>
      )}

      {/* Submit error */}
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ImageIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <rect x="1" y="2.5" width="13" height="10" rx="1.8" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="5" cy="6" r="1.1" fill="currentColor" opacity="0.7" />
      <path d="M1 10l3-3 2.5 2.5 2-2 4 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
