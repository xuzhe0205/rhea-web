"use client";

type FloatingPosition = {
  top: number;
  left: number;
};

export function SelectionToolbar(props: {
  visible: boolean;
  isMobile: boolean;
  canAddHighlight?: boolean;
  canRemoveHighlight?: boolean;
  canComment?: boolean;
  onHighlight: () => void;
  onRemove: () => void;
  onComment: () => void;
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
      className={props.isMobile ? "fixed inset-x-4 z-50" : "fixed z-50 -translate-x-1/2"}
      style={
        props.isMobile
          ? {
              bottom: `${(props.mobileFooterOffset ?? 0) + 12}px`,
            }
          : desktopStyle
      }
    >
      <div
        className={
          props.isMobile
            ? [
                "rounded-[20px] border border-white/[0.14]",
                "bg-[linear-gradient(180deg,rgba(9,13,22,0.98),rgba(5,8,15,0.98))]",
                "backdrop-blur-xl",
                "shadow-[0_18px_44px_rgba(0,0,0,0.42),0_0_0_1px_rgba(116,152,255,0.08)]",
                "px-2.5 py-2.5",
                "flex items-center justify-center gap-2",
                "animate-[toolbar-in_140ms_ease-out]",
              ].join(" ")
            : [
                "rounded-2xl border border-white/[0.10]",
                "bg-[linear-gradient(180deg,rgba(14,18,28,0.98),rgba(9,12,20,0.98))]",
                "p-1 backdrop-blur",
                "shadow-[0_14px_34px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.04)]",
                "flex items-center gap-1",
              ].join(" ")
        }
      >
        {props.canAddHighlight ? (
          <button
            type="button"
            onClick={props.onHighlight}
            className="rhea-focus rounded-xl px-3 py-2 text-xs font-medium text-white/92 transition hover:bg-white/[0.08]"
          >
            Highlight
          </button>
        ) : null}

        {props.canRemoveHighlight ? (
          <button
            type="button"
            onClick={props.onRemove}
            className="rhea-focus rounded-xl px-3 py-2 text-xs font-medium text-white/92 transition hover:bg-white/[0.08]"
          >
            Remove highlight
          </button>
        ) : null}

        {props.canComment ? (
          <button
            type="button"
            onClick={props.onComment}
            className="rhea-focus rounded-xl px-3 py-2 text-xs font-medium text-white/72 transition hover:bg-white/[0.08] hover:text-white"
          >
            Comment
          </button>
        ) : null}

        {props.canAddHighlight || props.canRemoveHighlight || props.canComment ? (
          <div className="mx-1 h-5 w-px bg-white/10" aria-hidden="true" />
        ) : null}

        <button
          type="button"
          onClick={props.onDismiss}
          className="rhea-focus rounded-xl px-3 py-2 text-xs font-medium text-[color:var(--text-0)]/85 transition hover:bg-[color:var(--bg-1)] hover:text-[color:var(--text-0)]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
