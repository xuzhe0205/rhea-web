"use client";

import * as React from "react";

export function ActionMenu(props: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={[
        "min-w-[148px] overflow-hidden rounded-2xl border border-[color:var(--border-0)]",
        "bg-[color:var(--bg-1)]/96 backdrop-blur-xl",
        "shadow-[0_10px_30px_rgba(0,0,0,0.28)] ring-1 ring-white/5",
        "origin-top-right transition-all duration-150",
        props.className ?? "",
      ].join(" ")}
    >
      {props.children}
    </div>
  );
}
