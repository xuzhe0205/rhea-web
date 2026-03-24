import * as React from "react";

export function ActionRowButton(props: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={[
        "inline-flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm transition",
        "font-medium text-[color:var(--text-0)]",
        "rounded-[var(--radius-md)] border border-[color:var(--border-0)] bg-[color:var(--bg-2)]",
        "hover:bg-[color:var(--bg-3)] hover:border-[color:var(--text-2)]/30",
        "shadow-sm",
      ].join(" ")}
    >
      {props.children}
    </button>
  );
}
