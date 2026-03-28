"use client";

export function SelectionToolbar({
  visible,
  isMobile,
  position,
  canAddHighlight,
  canRemoveHighlight,
  canComment,
  onHighlight,
  onRemove,
  onComment,
  onDismiss,
  mobileFooterOffset,
}: {
  visible: boolean;
  isMobile: boolean;
  position: { top: number; left: number } | null;
  canAddHighlight: boolean;
  canRemoveHighlight: boolean;
  canComment: boolean;
  onHighlight: () => void;
  onRemove: () => void;
  onComment: () => void;
  onDismiss: () => void;
  mobileFooterOffset?: number;
}) {
  if (!visible) return null;

  if (isMobile) {
    return (
      <div
        className="fixed left-1/2 z-[80] -translate-x-1/2"
        style={{ bottom: (mobileFooterOffset ?? 0) + 16 }}
      >
        <div className="flex items-center gap-2 rounded-2xl border border-[color:var(--border-0)] bg-[color:var(--bg-2)] px-3 py-2 shadow-2xl">
          <ToolbarButton disabled={!canAddHighlight} onClick={onHighlight}>
            Highlight
          </ToolbarButton>
          <ToolbarButton disabled={!canRemoveHighlight} onClick={onRemove}>
            Remove
          </ToolbarButton>
          <ToolbarButton disabled={!canComment} onClick={onComment}>
            Comment
          </ToolbarButton>
          <ToolbarButton onClick={onDismiss}>Done</ToolbarButton>
        </div>
      </div>
    );
  }

  if (!position) return null;

  return (
    <div
      className="fixed z-[80] -translate-x-1/2"
      style={{ top: position.top, left: position.left }}
    >
      <div className="flex items-center gap-2 rounded-2xl border border-[color:var(--border-0)] bg-[color:var(--bg-2)] px-3 py-2 shadow-2xl">
        <ToolbarButton disabled={!canAddHighlight} onClick={onHighlight}>
          Highlight
        </ToolbarButton>
        <ToolbarButton disabled={!canRemoveHighlight} onClick={onRemove}>
          Remove
        </ToolbarButton>
        <ToolbarButton disabled={!canComment} onClick={onComment}>
          Comment
        </ToolbarButton>
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-xl px-3 py-2 text-sm text-[color:var(--text-0)] transition hover:bg-white/5 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
