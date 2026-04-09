"use client";

import type { AttachedImage } from "@/hooks/useImageAttach";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Single thumbnail tile ────────────────────────────────────────────────────

function Thumbnail({
  image,
  onRemove,
}: {
  image: AttachedImage;
  onRemove: (localId: string) => void;
}) {
  const isUploading = image.status === "uploading";
  const isError = image.status === "error";

  return (
    <div className="relative shrink-0 h-[68px] w-[68px]">
      {/* Main tile */}
      <div
        className={[
          "h-full w-full overflow-hidden rounded-2xl border transition-all duration-200",
          isError
            ? "border-red-500/50 bg-red-950/30"
            : "border-white/8 bg-[color:var(--bg-3)]",
        ].join(" ")}
      >
        {/* Loaded image */}
        {image.url && !isError && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={image.name}
            className="h-full w-full object-cover"
            draggable={false}
          />
        )}

        {/* Uploading shimmer */}
        {isUploading && (
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-full w-full animate-pulse bg-[color:var(--bg-3)]" />
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-1">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className="text-red-400 shrink-0"
            >
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
              <path d="M8 5v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="11" r="0.75" fill="currentColor" />
            </svg>
          </div>
        )}

        {/* Uploading spinner overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="h-5 w-5 animate-spin text-white/60"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2.5"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        )}

        {/* Size pill — bottom-left, only when done */}
        {image.status === "done" && (
          <div className="absolute bottom-1 left-1 rounded-md bg-black/55 px-1 py-0.5 backdrop-blur-sm">
            <span className="font-mono text-[9px] leading-none text-white/80">
              {formatSize(image.sizeBytes)}
            </span>
          </div>
        )}
      </div>

      {/* Remove button — top-right corner */}
      <button
        type="button"
        onClick={() => onRemove(image.localId)}
        aria-label={`Remove ${image.name}`}
        className={[
          "absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center",
          "rounded-full border border-[color:var(--bg-1)] bg-[color:var(--bg-3)]",
          "text-[color:var(--text-2)] transition hover:bg-[color:var(--text-2)] hover:text-[color:var(--bg-1)]",
          "shadow-sm",
        ].join(" ")}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
          <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>

      {/* Error tooltip — shown on hover via title */}
      {isError && image.errorMsg && (
        <div
          title={image.errorMsg}
          className="absolute inset-0 rounded-2xl"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// ─── Strip component ──────────────────────────────────────────────────────────

export function ImageStrip({
  images,
  onRemove,
}: {
  images: AttachedImage[];
  onRemove: (localId: string) => void;
}) {
  if (images.length === 0) return null;

  return (
    <div className="border-b border-[color:var(--border-0)] px-3 pt-3 pb-2.5">
      <div className="flex gap-2.5 overflow-x-auto pb-0.5 scrollbar-none">
        {images.map((img) => (
          <Thumbnail key={img.localId} image={img} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}
