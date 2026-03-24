"use client";

import * as React from "react";
import { useState } from "react";
import { PinIcon } from "../ui/PinIcon";
import { PinOffIcon } from "../ui/PinOffIcon";

type Props = {
  title: string;
  active?: boolean;
  pinned?: boolean;
  pinPending?: boolean;
  onClick?: () => void;
  onTogglePin?: () => void;
};

export const ConversationNavItem = React.forwardRef<HTMLDivElement, Props>(
  function ConversationNavItem({ title, active, pinned, pinPending, onClick, onTogglePin }, ref) {
    const [hovered, setHovered] = useState(false);

    // pinned 时常亮；hover / pending 时也显示
    const showPinControl = hovered || pinPending || pinned;

    return (
      <div
        ref={ref}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="group relative"
      >
        {active ? (
          <span className="absolute left-0 top-1/2 z-10 h-5 -translate-y-1/2 rounded-full border-l-2 border-[color:var(--accent)]" />
        ) : null}

        <button
          type="button"
          onClick={onClick}
          className={[
            "relative flex w-full items-center rounded-[var(--radius-md)] px-3 py-2 pr-3 text-left text-sm transition-all duration-200",
            "text-[color:var(--text-0)]",
            active ? "bg-[color:var(--bg-2)]" : "hover:bg-[color:var(--bg-3)]",
          ].join(" ")}
        >
          <span className="ml-1 min-w-0 flex-1 truncate select-text">{title}</span>

          {(hovered || pinPending) && (
            <span className="pointer-events-none absolute right-9 top-1 bottom-1 w-8 bg-gradient-to-l from-[color:var(--bg-2)]/70 to-transparent" />
          )}
        </button>

        <div
          className={[
            "absolute right-2 top-1/2 -translate-y-1/2 transition-all duration-200",
            showPinControl ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none",
          ].join(" ")}
        >
          <button
            type="button"
            aria-label={pinned ? "Unpin conversation" : "Pin conversation"}
            title={pinned ? "Unpin" : "Pin"}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin?.();
            }}
            className={[
              "inline-flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-200",
              "border-[color:var(--border-0)] bg-[color:var(--bg-1)]/92 backdrop-blur-sm",
              pinned
                ? "text-[color:var(--accent)] brightness-125 shadow-[0_0_0_1px_rgba(94,124,226,0.10)] hover:bg-[color:var(--bg-2)]"
                : "text-[color:var(--text-2)] hover:bg-[color:var(--bg-2)] hover:text-[color:var(--text-0)]",
              pinPending ? "scale-110" : "scale-100",
            ].join(" ")}
          >
            {pinned && hovered ? <PinOffIcon /> : <PinIcon filled={pinned} />}
          </button>
        </div>
      </div>
    );
  },
);
