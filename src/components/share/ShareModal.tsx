"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  isOpen: boolean;
  url: string;
  preview: string; // first ~120 chars of the first message
  onClose: () => void;
};

export function ShareModal({ isOpen, url, preview, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Reset copied state when modal opens
  useEffect(() => {
    if (isOpen) setCopied(false);
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard API unavailable — fallback: select the URL text
    }
  }

  function handleShareTo(target: "x" | "linkedin" | "reddit") {
    const encoded = encodeURIComponent(url);
    const text = encodeURIComponent("Check out this conversation on RHEA Index");
    const urls: Record<string, string> = {
      x: `https://x.com/intent/tweet?url=${encoded}&text=${text}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
      reddit: `https://www.reddit.com/submit?url=${encoded}&title=${text}`,
    };
    window.open(urls[target], "_blank", "noopener,noreferrer");
  }

  const plain = preview
    .replace(/!\[.*?\]\(.*?\)/g, "")   // images
    .replace(/\[([^\]]+)\]\(.*?\)/g, "$1") // links
    .replace(/#{1,6}\s+/g, "")         // headings
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1") // bold/italic
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // code
    .replace(/>\s+/g, "")              // blockquotes
    .replace(/\n+/g, " ")             // newlines
    .trim();
  const truncated = plain.length > 120 ? plain.slice(0, 120) + "…" : plain;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Share conversation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Dim */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel — slides up on mobile, centered on desktop */}
      <div className="relative z-10 w-full max-w-sm rounded-t-[20px] sm:rounded-[20px] border border-[color:var(--border-0)] bg-[color:var(--bg-1)] shadow-2xl">
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-[color:var(--border-0)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 sm:pt-5">
          <span className="text-[15px] font-semibold text-[color:var(--text-0)]">
            Share to RHEA Index
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full text-[color:var(--text-2)] hover:bg-[color:var(--bg-3)] hover:text-[color:var(--text-0)] transition"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Preview card */}
        {truncated && (
          <div className="mx-5 mb-4 rounded-[var(--radius-md)] border border-[color:var(--border-0)] bg-[color:var(--bg-2)] px-4 py-3">
            <p className="line-clamp-3 text-sm leading-relaxed text-[color:var(--text-1)]">
              {truncated}
            </p>
          </div>
        )}

        {/* Copy link */}
        <div className="px-5 pb-4">
          <button
            type="button"
            onClick={handleCopy}
            className={[
              "flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 py-3 text-sm font-medium transition",
              copied
                ? "bg-green-500/15 text-green-400 border border-green-500/20"
                : "bg-[color:var(--accent)] text-white hover:opacity-90 active:opacity-80",
            ].join(" ")}
          >
            {copied ? (
              <>
                <CheckIcon /> Link copied
              </>
            ) : (
              <>
                <LinkIcon /> Copy link
              </>
            )}
          </button>
        </div>

        {/* Divider + social */}
        <div className="px-5 pb-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[color:var(--border-0)]" />
            <span className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-2)]">or share to</span>
            <div className="h-px flex-1 bg-[color:var(--border-0)]" />
          </div>

          <div className="flex justify-center gap-4">
            <SocialButton label="X (Twitter)" onClick={() => handleShareTo("x")}>
              <XIcon />
            </SocialButton>
            <SocialButton label="LinkedIn" onClick={() => handleShareTo("linkedin")}>
              <LinkedInIcon />
            </SocialButton>
            <SocialButton label="Reddit" onClick={() => handleShareTo("reddit")}>
              <RedditIcon />
            </SocialButton>
          </div>
        </div>

        {/* Footer note */}
        <div className="border-t border-[color:var(--border-0)] px-5 py-3 text-center text-[11px] text-[color:var(--text-2)]">
          Anyone with the link can view — no sign-in required
        </div>
      </div>
    </div>
  );
}

// ─── Small components ─────────────────────────────────────────────────────────

function SocialButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex flex-col items-center gap-1.5 group"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--border-0)] bg-[color:var(--bg-2)] text-[color:var(--text-1)] transition group-hover:bg-[color:var(--bg-3)] group-hover:text-[color:var(--text-0)]">
        {children}
      </span>
      <span className="text-[10px] text-[color:var(--text-2)]">{label}</span>
    </button>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function LinkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M8.5 6.5l-2 2a2.12 2.12 0 000 3 2.12 2.12 0 003 0l2-2a4.24 4.24 0 000-6 4.24 4.24 0 00-6 0l-1 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M6.5 8.5l2-2a2.12 2.12 0 000-3 2.12 2.12 0 00-3 0l-2 2a4.24 4.24 0 000 6 4.24 4.24 0 006 0l1-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M12.6 1h2.3L9.8 6.6 15.7 15h-4.2l-3.7-4.9L3.6 15H1.3l5.5-6L.7 1h4.3l3.3 4.4L12.6 1zm-.8 12.6h1.3L4.3 2.3H2.9l9 11.3z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M1.5 5.5h3v9h-3v-9zm1.5-1.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM5.5 5.5h2.8v1.2h.04C8.8 5.9 10 5.3 11.5 5.3c3.2 0 3.8 2.1 3.8 4.8v5.4h-3V10.7c0-1.1 0-2.5-1.5-2.5s-1.8 1.2-1.8 2.4v3.9h-3v-9z" />
    </svg>
  );
}

function RedditIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="currentColor" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="8" />
      <path fill="var(--bg-1)" d="M14 8.5a1.4 1.4 0 00-1.4-1.4c-.37 0-.7.14-.95.37A6.7 6.7 0 009 6.4l.6-2.8 1.9.4a1 1 0 101-1 1 1 0 00-.93.63l-2.1-.45a.2.2 0 00-.24.15l-.67 3.1a6.74 6.74 0 00-3.63 1.07 1.38 1.38 0 10-1.55 2.2c-.02.16-.03.33-.03.5 0 2.55 2.96 4.6 6.6 4.6s6.6-2.05 6.6-4.6c0-.17 0-.34-.03-.5.46-.26.76-.75.76-1.3zm-8.5 2a1 1 0 110-2 1 1 0 010 2zm4.4 2.6c-.65.65-1.65.65-1.9.65-.25 0-1.25 0-1.9-.65a.2.2 0 01.28-.28c.4.4 1.1.54 1.62.54s1.22-.14 1.62-.54a.2.2 0 01.28.28zm-.15-1.6a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
  );
}
