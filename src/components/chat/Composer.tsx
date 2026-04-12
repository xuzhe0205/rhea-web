"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageStrip } from "@/components/chat/ImageStrip";
import { useImageAttach, MAX_IMAGES } from "@/hooks/useImageAttach";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { transcribeAudio } from "@/lib/transcribe";

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
  const [isFocused, setIsFocused] = useState(false);
  const [expandOpen, setExpandOpen] = useState(false);
  const [expandValue, setExpandValue] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [micPermission, setMicPermission] = useState<"granted" | "prompt" | "denied" | "unknown">("unknown");

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdActiveRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: none) and (pointer: coarse)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Track microphone permission state so we can gate hold-to-talk behind it
  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions.query({ name: "microphone" as PermissionName }).then((status) => {
      setMicPermission(status.state as "granted" | "prompt" | "denied");
      status.addEventListener("change", () => {
        setMicPermission(status.state as "granted" | "prompt" | "denied");
      });
    }).catch(() => {});
  }, []);

  const handleTranscribed = useCallback(async (blob: Blob) => {
    const transcript = await transcribeAudio(blob, token);
    if (!transcript) return;
    setValue((prev) => {
      const joined = prev ? `${prev} ${transcript}` : transcript;
      return joined;
    });
    inputRef.current?.focus();
  }, [token]);

  const { recorderState, elapsed, startRecording, stopRecording, cancelRecording } = useVoiceRecorder(handleTranscribed);

  // Track whether the finger has slid into the cancel zone.
  // Use a ref (not just state) so onTouchEnd closure always reads the latest value.
  const [inCancelZone, setInCancelZone] = useState(false);
  const inCancelZoneRef = useRef(false);
  const cancelZoneRef = useRef<HTMLDivElement>(null);

  // Returns true only when the pointer is within the pill element ± CANCEL_BUFFER px.
  // Checking BOTH top and bottom prevents the entire area below the pill from
  // becoming a cancel zone, which would accidentally cancel when the composer
  // sits at the bottom of the screen (user's finger already below the pill).
  const CANCEL_BUFFER = 24;
  function isOverCancelPill(clientX: number, clientY: number) {
    const el = cancelZoneRef.current;
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return (
      clientY >= rect.top    - CANCEL_BUFFER &&
      clientY <= rect.bottom + CANCEL_BUFFER &&
      clientX >= rect.left   - CANCEL_BUFFER &&
      clientX <= rect.right  + CANCEL_BUFFER
    );
  }

  function handleOverlayCancel() {
    holdActiveRef.current = false;
    inCancelZoneRef.current = false;
    setInCancelZone(false);
    cancelRecording();
  }


  // Suppress text selection anywhere on the page while recording on mobile.
  // Applied immediately (not waiting for the overlay to mount) to close the
  // brief gap between touchstart and the first React re-render.
  useEffect(() => {
    if (!isMobile || recorderState !== "recording") return;
    const prev = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    (document.body.style as CSSStyleDeclaration & { webkitUserSelect: string }).webkitUserSelect = "none";
    return () => {
      document.body.style.userSelect = prev;
      (document.body.style as CSSStyleDeclaration & { webkitUserSelect: string }).webkitUserSelect = prev;
    };
  }, [isMobile, recorderState]);

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

        {/* Input row — changes entirely when recording */}
        {recorderState === "recording" ? (
          <div className="flex items-center gap-3 px-3 py-2.5">
            {/* Pulsing indicator */}
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-400" />
            </span>
            <span className="text-sm font-medium text-red-400">Listening</span>
            <span className="font-mono text-sm text-red-400">{formatElapsed(elapsed)}</span>
            <div className="flex-1" />
            {isMobile ? (
              <span className="text-xs text-red-400/70">Release</span>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                {/* Cancel — discard recording, no transcription */}
                <button
                  type="button"
                  onClick={() => cancelRecording()}
                  title="Cancel — recording won't be transcribed"
                  className="rhea-focus inline-flex h-9 items-center rounded-[var(--radius-md)] px-3 text-xs text-[color:var(--text-1)] transition hover:bg-[color:var(--bg-3)] hover:text-[color:var(--text-0)]"
                >
                  Cancel
                </button>
                {/* Stop — end recording and transcribe */}
                <button
                  type="button"
                  aria-label="Stop and transcribe"
                  title="Stop — converts your speech to text"
                  className="rhea-focus inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-red-500/15 text-red-400 transition hover:bg-red-500/25"
                  onClick={() => void stopRecording()}
                >
                  <StopIcon />
                </button>
              </div>
            )}
          </div>
        ) : recorderState === "transcribing" ? (
          <div className="flex items-center gap-3 px-3 py-2.5">
            <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
            <span className="text-sm text-[color:var(--text-1)]">Transcribing your message…</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 p-2">
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
                  "text-[color:var(--text-1)] transition",
                  disabled || atLimit
                    ? "cursor-not-allowed opacity-35"
                    : "hover:bg-[color:var(--bg-3)] hover:text-[color:var(--text-0)]",
                ].join(" ")}
              >
                <ImageIcon />
              </button>
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
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />

            {/* Mic button */}
            <div className="relative shrink-0">
              <button
                type="button"
                aria-label={isMobile ? "Hold to speak" : "Voice input"}
                title={isMobile ? "Hold to speak · 按住说话" : "Voice input"}
                disabled={disabled}
                className={[
                  "rhea-focus inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] transition",
                  "text-[color:var(--text-1)] hover:bg-[color:var(--bg-3)] hover:text-[color:var(--text-0)]",
                  disabled ? "cursor-not-allowed opacity-35" : "",
                  isMobile ? "touch-none select-none" : "",
                ].join(" ")}
                style={isMobile ? { WebkitUserSelect: "none", userSelect: "none" } : undefined}
                onClick={!isMobile ? () => void startRecording() : undefined}
                onTouchStart={isMobile && !disabled ? (e) => {
                  if (micPermission !== "granted") {
                    // First touch: just warm up the permission — don't preventDefault
                    // so the browser can show the native dialog cleanly.
                    // Once the user taps Allow, micPermission flips to "granted"
                    // and the next hold will work correctly.
                    navigator.mediaDevices.getUserMedia({ audio: true })
                      .then((stream) => {
                        stream.getTracks().forEach((t) => t.stop());
                        setMicPermission("granted");
                      })
                      .catch(() => {});
                    return;
                  }

                  // Permission granted — own the full gesture.
                  e.preventDefault();
                  holdActiveRef.current = true;
                  void startRecording();
                } : undefined}
              >
                <MicIcon />
              </button>
            </div>

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
        )}
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

      {/* Recording progress */}
      {recorderState === "recording" && (
        <div className="mt-2 space-y-1.5">
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-[color:var(--bg-3)]">
            <div
              className={[
                "h-full rounded-full transition-[width] duration-1000 ease-linear",
                elapsed >= 50 ? "bg-red-400" : "bg-[color:var(--accent)]",
              ].join(" ")}
              style={{ width: `${Math.min((elapsed / 60) * 100, 100)}%` }}
            />
          </div>
          <p className={[
            "text-xs",
            elapsed >= 50 ? "text-red-400" : "text-[color:var(--text-2)]",
          ].join(" ")}>
            {isMobile
              ? "Release to stop"
              : (60 - elapsed > 0
                  ? `${60 - elapsed} second${60 - elapsed === 1 ? "" : "s"} remaining`
                  : "Stopping…")}
          </p>
        </div>
      )}

      {/* Expand button — shown when textarea value is long */}
      {recorderState === "idle" && value.length > 200 && (
        <div className="mt-1.5 flex justify-end">
          <button
            type="button"
            onClick={() => { setExpandValue(value); setExpandOpen(true); }}
            className="inline-flex items-center gap-1 text-[11px] text-[color:var(--text-2)] transition hover:text-[color:var(--text-0)]"
          >
            <ExpandIcon />
            Expand to edit
          </button>
        </div>
      )}

      {/* Footer hint — hidden on mobile when idle */}
      {recorderState === "idle" && (
        <div
          className={[
            "mt-2 items-center justify-between text-xs text-[color:var(--text-2)]",
            isFocused || hasImages || disabled ? "flex" : "hidden",
          ].join(" ")}
        >
          <span>
            {disabled
              ? "Streaming response…"
              : hasImages
              ? `${activeImageCount}/10 images${isMobile ? "" : " · Enter to send"}`
              : isMobile
              ? "Hold mic to speak"
              : "Enter to send · Shift+Enter for newline · ⌘V to paste image"}
          </span>
          <span className="hidden sm:inline">RHEA Index</span>
        </div>
      )}

      {/* Hold-to-talk overlay — mobile only.
          Layout: top 72% = recording zone (release here → transcribe)
                  bottom 28% = cancel zone (slide finger down → release to discard)
          onTouchMove tracks which zone the finger is in; onTouchEnd reads the ref. */}
      {isMobile && recorderState === "recording" && (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-black/55 backdrop-blur-sm"
          style={{ touchAction: "none" }}
          onPointerMove={(e) => {
            const inZone = isOverCancelPill(e.clientX, e.clientY);
            inCancelZoneRef.current = inZone;
            setInCancelZone(inZone);
          }}
          onPointerUp={(e) => {
            holdActiveRef.current = false;
            inCancelZoneRef.current = false;
            setInCancelZone(false);
            if (isOverCancelPill(e.clientX, e.clientY)) {
              cancelRecording();
            } else {
              void stopRecording();
            }
          }}
          onPointerCancel={handleOverlayCancel}
          onTouchEnd={(e) => {
            // Fallback for browsers where pointer events don't fire on overlay.
            const t = e.changedTouches[0];
            holdActiveRef.current = false;
            inCancelZoneRef.current = false;
            setInCancelZone(false);
            if (t && isOverCancelPill(t.clientX, t.clientY)) {
              cancelRecording();
            } else {
              void stopRecording();
            }
          }}
          onTouchCancel={handleOverlayCancel}
        >
          {/* ── Recording zone (top 72%) ── */}
          <div className="flex flex-1 flex-col items-center justify-center px-6">
            <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-red-500/15 bg-[color:var(--bg-2)] p-5 shadow-2xl">
              <div className="mb-4 flex items-center gap-3">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-400" />
                </span>
                <span className="text-base font-medium text-red-400">Listening</span>
                <span className="font-mono text-base text-red-400">{formatElapsed(elapsed)}</span>
              </div>
              <div className="h-[3px] w-full overflow-hidden rounded-full bg-[color:var(--bg-3)]">
                <div
                  className={["h-full rounded-full transition-[width] duration-1000 ease-linear", elapsed >= 50 ? "bg-red-400" : "bg-[color:var(--accent)]"].join(" ")}
                  style={{ width: `${Math.min((elapsed / 60) * 100, 100)}%` }}
                />
              </div>
              <p className="mt-3 text-center text-sm text-[color:var(--text-2)]">
                Release to stop
              </p>
            </div>
          </div>

          {/* ── Cancel zone (bottom 28%) ── */}
          <div
            className="flex flex-col items-center justify-start gap-3 pt-5"
            style={{ height: "28%", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
          >
            <div
              ref={cancelZoneRef}
              className={["flex items-center gap-2 rounded-full border px-5 py-2.5 transition-all duration-150", inCancelZone ? "border-red-400/50 bg-red-500/15 text-red-400 scale-105" : "border-white/15 text-[color:var(--text-2)]"].join(" ")}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-sm">Release here to cancel</span>
            </div>
          </div>
        </div>
      )}

      {/* Expand modal */}
      {expandOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center"
          onClick={() => setExpandOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-[var(--radius-lg)] border border-white/[0.07] bg-[color:var(--bg-3)] shadow-[0_8px_40px_rgba(0,0,0,0.55)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[color:var(--border-0)] px-4 py-3">
              <span className="text-sm font-medium text-[color:var(--text-0)]">Edit message</span>
              <button
                type="button"
                onClick={() => setExpandOpen(false)}
                className="text-[color:var(--text-2)] hover:text-[color:var(--text-0)] transition"
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <textarea
              className="min-h-[200px] max-h-[60vh] flex-1 resize-none bg-transparent px-4 py-3 text-[15px] leading-6 text-[color:var(--text-0)] placeholder:text-[color:var(--text-2)] focus:outline-none"
              value={expandValue}
              onChange={(e) => setExpandValue(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2 border-t border-[color:var(--border-0)] px-4 py-3">
              <button
                type="button"
                onClick={() => setExpandOpen(false)}
                className="px-4 py-2 text-sm text-[color:var(--text-2)] transition hover:text-[color:var(--text-0)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { setValue(expandValue); setExpandOpen(false); inputRef.current?.focus(); }}
                className="rounded-[var(--radius-md)] bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function formatElapsed(s: number) {
  const m = Math.floor(s / 60).toString().padStart(1, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="2" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="9" y1="22" x2="15" y2="22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 17 17" fill="none" aria-hidden="true">
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
    <svg width="18" height="18" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path
        d="M13 7.5L2 2l2.5 5.5L2 13l11-5.5z"
        fill="currentColor"
        strokeLinejoin="round"
      />
    </svg>
  );
}
