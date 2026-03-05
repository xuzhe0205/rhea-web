"use client";

export function InlineAlert(props: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-[var(--radius-md)] border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200"
    >
      <AlertIcon />
      <div className="leading-snug">{props.message}</div>
    </div>
  );
}

function AlertIcon() {
  return (
    <svg
      className="mt-[2px] shrink-0"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M12 9v5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 17h.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M10.3 4.8a2 2 0 0 1 3.4 0l8 13.9A2 2 0 0 1 20 21H4a2 2 0 0 1-1.7-3.3l8-13.9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}