"use client";

export function HighlightToolbar(props: {
  visible: boolean;
  onHighlight: () => void;
  onDismiss: () => void;
}) {
  if (!props.visible) return null;

  return (
    <div className="absolute right-0 -top-12 z-30 flex items-center gap-1 rounded-2xl border border-[color:var(--border-0)] bg-[color:var(--bg-0)] p-1 shadow-[0_10px_30px_rgba(0,0,0,0.24)] backdrop-blur">
      <button
        type="button"
        onClick={props.onHighlight}
        className="rhea-focus rounded-xl px-3 py-2 text-xs font-medium text-[color:var(--text-0)] transition hover:bg-[color:var(--bg-1)]"
      >
        Highlight
      </button>

      <button
        type="button"
        onClick={props.onDismiss}
        className="rhea-focus rounded-xl px-3 py-2 text-xs font-medium text-[color:var(--text-2)] transition hover:bg-[color:var(--bg-1)]"
      >
        Close
      </button>
    </div>
  );
}