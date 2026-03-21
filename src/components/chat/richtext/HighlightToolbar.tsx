"use client";

type FloatingPosition = {
  top: number;
  left: number;
};

export function HighlightToolbar(props: {
  visible: boolean;
  isMobile: boolean;
  canAddHighlight?: boolean;
  canRemoveHighlight?: boolean;
  onHighlight: () => void;
  onRemove: () => void;
  onDismiss: () => void;
  position?: FloatingPosition | null;
  mobileFooterOffset?: number;
}) {
  if (!props.visible) return null;

  const desktopStyle =
    !props.isMobile && props.position
      ? {
          top: `${props.position.top}px`,
          left: `${props.position.left}px`,
        }
      : undefined;

  return (
    <div
      className={
        props.isMobile
          ? [
              "fixed inset-x-4 z-50",
              "rounded-[20px] border border-[color:var(--border-0)]",
              "bg-[color:var(--bg-0)]/95 backdrop-blur",
              "shadow-[0_10px_30px_rgba(0,0,0,0.24)]",
              "px-2 py-2",
              "flex items-center justify-center gap-2",
            ].join(" ")
          : [
              "fixed z-50",
              "-translate-x-1/2",
              "rounded-2xl border border-[color:var(--border-0)]",
              "bg-[color:var(--bg-0)] p-1 backdrop-blur",
              "shadow-[0_10px_30px_rgba(0,0,0,0.24)]",
              "flex items-center gap-1",
            ].join(" ")
      }
      style={
        props.isMobile
          ? {
              bottom: `${(props.mobileFooterOffset ?? 0) + 12}px`,
            }
          : desktopStyle
      }
    >
      {props.canAddHighlight ? (
        <button
          type="button"
          onClick={props.onHighlight}
          className="rhea-focus rounded-xl px-3 py-2 text-xs font-medium text-[color:var(--text-0)] transition hover:bg-[color:var(--bg-1)]"
        >
          Highlight
        </button>
      ) : null}

      {props.canRemoveHighlight ? (
        <button
          type="button"
          onClick={props.onRemove}
          className="rhea-focus rounded-xl px-3 py-2 text-xs font-medium text-[color:var(--text-0)]/80 transition hover:bg-[color:var(--bg-1)]"
        >
          Remove highlight
        </button>
      ) : null}

      {(props.canAddHighlight || props.canRemoveHighlight) ? (
        <div className="mx-1 h-5 w-px bg-white/10" aria-hidden="true" />
      ) : null}

      <button
        type="button"
        onClick={props.onDismiss}
        className="rhea-focus rounded-xl px-3 py-2 text-xs font-medium text-[color:var(--text-0)] transition hover:bg-[color:var(--bg-1)] hover:text-[color:var(--text-0)]"
      >
        Close
      </button>
    </div>
  );
}