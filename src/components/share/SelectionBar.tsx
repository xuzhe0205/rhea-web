"use client";

export function SelectionBar({
  count,
  onShare,
  onCancel,
  sharing,
}: {
  count: number;
  onShare: () => void;
  onCancel: () => void;
  sharing: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={onCancel}
        className="px-1 py-1.5 text-sm text-[color:var(--text-2)] transition hover:text-[color:var(--text-0)]"
      >
        Cancel
      </button>

      <button
        type="button"
        onClick={onShare}
        disabled={count === 0 || sharing}
        className="rounded-full bg-[color:var(--accent)] px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {sharing
          ? "Sharing…"
          : count > 0
          ? `Share ${count} message${count === 1 ? "" : "s"}`
          : "Share"}
      </button>
    </div>
  );
}
