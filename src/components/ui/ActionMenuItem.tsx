"use client";

import * as React from "react";

export function ActionMenuItem(props: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  showDividerAbove?: boolean;
}) {
  return (
    <>
      {props.showDividerAbove ? <div className="h-px bg-[color:var(--border-0)]" /> : null}

      <button
        type="button"
        onClick={props.onClick}
        className={[
          "flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition",
          props.danger
            ? "text-red-400 hover:bg-red-500/10 active:bg-red-500/10"
            : "text-[color:var(--text-0)] hover:bg-[color:var(--bg-2)] active:bg-[color:var(--bg-2)]",
        ].join(" ")}
      >
        <span
          className={[
            "inline-flex h-8 w-8 items-center justify-center rounded-full border",
            props.danger
              ? "border-red-500/20 bg-red-500/10"
              : "border-[color:var(--border-0)] bg-[color:var(--bg-2)]",
          ].join(" ")}
        >
          {props.icon}
        </span>

        <span className="font-medium">{props.label}</span>
      </button>
    </>
  );
}
