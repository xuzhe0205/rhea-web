"use client";

import { useRef, useState } from "react";

// ─── Utility ──────────────────────────────────────────────────────────────────

export function formatElapsed(s: number): string {
  const m = Math.floor(s / 60).toString().padStart(1, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

export function MicIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="2" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="9" y1="22" x2="15" y2="22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function StopIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

/** Image-attachment icon — used in the composer footer. */
export function ImageAttachIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 17 17" fill="none" aria-hidden="true">
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

// ─── Inline recording row ─────────────────────────────────────────────────────

/**
 * Replaces the textarea row while recording is active.
 * Renders the pulsing indicator + elapsed time, and either:
 *   desktop — Cancel (text) + Stop (icon) buttons
 *   mobile  — a "Release" hint (the overlay handles the actual interaction)
 */
export function RecordingInlineRow({
  elapsed,
  isMobile,
  onCancel,
  onStop,
  className = "flex items-center gap-3 px-3 py-2.5",
}: {
  elapsed: number;
  isMobile: boolean;
  onCancel: () => void;
  onStop: () => void;
  /** Outer div className. Override padding to match surrounding composer layout. */
  className?: string;
}) {
  return (
    <div className={className}>
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
          <button
            type="button"
            onClick={onCancel}
            title="Cancel — recording won't be transcribed"
            className="inline-flex h-9 items-center rounded-[var(--radius-md)] px-3 text-xs text-[color:var(--text-1)] transition hover:bg-[color:var(--bg-3)] hover:text-[color:var(--text-0)]"
          >
            Cancel
          </button>
          <button
            type="button"
            aria-label="Stop and transcribe"
            title="Stop — converts your speech to text"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-red-500/15 text-red-400 transition hover:bg-red-500/25"
            onClick={onStop}
          >
            <StopIcon />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Inline transcribing row ──────────────────────────────────────────────────

/** Replaces the textarea row while STT transcription is in progress. */
export function TranscribingInlineRow({
  className = "flex items-center gap-3 px-3 py-2.5",
}: {
  /** Outer div className. Override padding to match surrounding composer layout. */
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
      <span className="text-sm text-[color:var(--text-1)]">Transcribing your message…</span>
    </div>
  );
}

// ─── Recording progress bar ───────────────────────────────────────────────────

/**
 * Thin progress bar + countdown/hint text rendered below the composer box
 * while recording is active.
 */
export function RecordingProgress({
  elapsed,
  isMobile,
}: {
  elapsed: number;
  isMobile: boolean;
}) {
  return (
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
      <p className={["text-xs", elapsed >= 50 ? "text-red-400" : "text-[color:var(--text-2)]"].join(" ")}>
        {isMobile
          ? "Release to stop"
          : 60 - elapsed > 0
          ? `${60 - elapsed} second${60 - elapsed === 1 ? "" : "s"} remaining`
          : "Stopping…"}
      </p>
    </div>
  );
}

// ─── Mobile recording overlay ─────────────────────────────────────────────────

const CANCEL_BUFFER = 24;

/**
 * Full-screen overlay shown on mobile while recording is active.
 *
 * Layout:
 *   top 72%    — recording card (release finger here → transcribe)
 *   bottom 28% — cancel pill (slide finger down → release to discard)
 *
 * All cancel-zone state is managed internally; callers only need to supply
 * the two action callbacks.
 */
export function MobileRecordingOverlay({
  elapsed,
  onCancelRecording,
  onStopRecording,
}: {
  elapsed: number;
  onCancelRecording: () => void;
  onStopRecording: () => void;
}) {
  const [inCancelZone, setInCancelZone] = useState(false);
  const inCancelZoneRef = useRef(false);
  const cancelZoneRef = useRef<HTMLDivElement | null>(null);

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

  function handleCancel() {
    inCancelZoneRef.current = false;
    setInCancelZone(false);
    onCancelRecording();
  }

  function handleStop() {
    inCancelZoneRef.current = false;
    setInCancelZone(false);
    onStopRecording();
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/55 backdrop-blur-sm"
      style={{ touchAction: "none" }}
      onPointerMove={(e) => {
        const inZone = isOverCancelPill(e.clientX, e.clientY);
        inCancelZoneRef.current = inZone;
        setInCancelZone(inZone);
      }}
      onPointerUp={(e) => {
        if (isOverCancelPill(e.clientX, e.clientY)) {
          handleCancel();
        } else {
          handleStop();
        }
      }}
      onPointerCancel={handleCancel}
      onTouchEnd={(e) => {
        // Fallback for browsers where pointer events don't fire on overlay.
        const t = e.changedTouches[0];
        if (t && isOverCancelPill(t.clientX, t.clientY)) {
          handleCancel();
        } else {
          handleStop();
        }
      }}
      onTouchCancel={handleCancel}
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
              className={[
                "h-full rounded-full transition-[width] duration-1000 ease-linear",
                elapsed >= 50 ? "bg-red-400" : "bg-[color:var(--accent)]",
              ].join(" ")}
              style={{ width: `${Math.min((elapsed / 60) * 100, 100)}%` }}
            />
          </div>
          <p className="mt-3 text-center text-sm text-[color:var(--text-2)]">Release to stop</p>
        </div>
      </div>

      {/* ── Cancel zone (bottom 28%) ── */}
      <div
        className="flex flex-col items-center justify-start gap-3 pt-5"
        style={{ height: "28%", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        <div
          ref={cancelZoneRef}
          className={[
            "flex items-center gap-2 rounded-full border px-5 py-2.5 transition-all duration-150",
            inCancelZone
              ? "border-red-400/50 bg-red-500/15 text-red-400 scale-105"
              : "border-white/15 text-[color:var(--text-2)]",
          ].join(" ")}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-sm">Release here to cancel</span>
        </div>
      </div>
    </div>
  );
}
