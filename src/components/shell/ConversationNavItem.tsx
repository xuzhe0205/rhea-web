"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { PinIcon } from "../ui/PinIcon";
import { PinOffIcon } from "../ui/PinOffIcon";
import { ActionMenu } from "../ui/ActionMenu";
import { ActionMenuItem } from "../ui/ActionMenuItem";

type Props = {
  title: string;
  active?: boolean;
  pinned?: boolean;
  pinPending?: boolean;
  onClick?: () => void;
  onTogglePin?: () => void;
};

const LONG_PRESS_MS = 450;
const MOVE_TOLERANCE_PX = 10;

export const ConversationNavItem = React.forwardRef<HTMLDivElement, Props>(
  function ConversationNavItem({ title, active, pinned, pinPending, onClick, onTogglePin }, ref) {
    const [hovered, setHovered] = useState(false);
    const [pressing, setPressing] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [openUpward, setOpenUpward] = useState(true);

    const timerRef = useRef<number | null>(null);
    const longPressTriggeredRef = useRef(false);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);

    const showDesktopPinControl = hovered || pinPending || pinned;

    function setMergedRef(node: HTMLDivElement | null) {
      rootRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }

    const clearLongPress = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setPressing(false);
      touchStartRef.current = null;
    };

    useEffect(() => {
      return () => clearLongPress();
    }, []);

    useEffect(() => {
      if (!menuOpen) return;

      const onPointerDown = (e: MouseEvent | TouchEvent) => {
        const el = rootRef.current;
        if (!el) return;

        const target = e.target as Node | null;
        if (target && !el.contains(target)) {
          setMenuOpen(false);
        }
      };

      const onEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setMenuOpen(false);
        }
      };

      document.addEventListener("mousedown", onPointerDown);
      document.addEventListener("touchstart", onPointerDown);
      document.addEventListener("keydown", onEscape);

      return () => {
        document.removeEventListener("mousedown", onPointerDown);
        document.removeEventListener("touchstart", onPointerDown);
        document.removeEventListener("keydown", onEscape);
      };
    }, [menuOpen]);

    const beginLongPress = (clientX: number, clientY: number) => {
      clearLongPress();
      longPressTriggeredRef.current = false;
      touchStartRef.current = { x: clientX, y: clientY };
      setPressing(true);

      timerRef.current = window.setTimeout(() => {
        longPressTriggeredRef.current = true;
        setPressing(false);

        const el = rootRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          const estimatedMenuHeight = 72;
          const topSpace = rect.top;
          setOpenUpward(topSpace > estimatedMenuHeight + 16);
        } else {
          setOpenUpward(true);
        }

        setMenuOpen(true);
      }, LONG_PRESS_MS);
    };

    const maybeCancelForMove = (clientX: number, clientY: number) => {
      const start = touchStartRef.current;
      if (!start) return;

      const dx = Math.abs(clientX - start.x);
      const dy = Math.abs(clientY - start.y);

      if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) {
        clearLongPress();
      }
    };

    const handleMenuPinClick = () => {
      setMenuOpen(false);
      onTogglePin?.();
    };

    return (
      <div
        ref={setMergedRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="group relative"
      >
        {active ? (
          <span className="absolute left-0 top-1/2 z-10 h-5 -translate-y-1/2 rounded-full border-l-2 border-[color:var(--accent)]" />
        ) : null}

        <button
          type="button"
          onClick={() => {
            if (longPressTriggeredRef.current) {
              longPressTriggeredRef.current = false;
              return;
            }
            if (menuOpen) {
              setMenuOpen(false);
              return;
            }
            onClick?.();
          }}
          onTouchStart={(e) => {
            const t = e.touches[0];
            if (!t) return;
            beginLongPress(t.clientX, t.clientY);
          }}
          onTouchMove={(e) => {
            const t = e.touches[0];
            if (!t) return;
            maybeCancelForMove(t.clientX, t.clientY);
          }}
          onTouchEnd={() => {
            clearLongPress();
          }}
          onTouchCancel={() => {
            clearLongPress();
          }}
          className={[
            "relative flex w-full items-center rounded-[var(--radius-md)] px-3 py-2 text-left text-sm transition-all duration-200",
            "text-[color:var(--text-0)] select-none touch-manipulation",
            // 手机上要给常亮 pin indicator 预留一点空间；桌面端维持原来
            pinned ? "pr-10 md:pr-3" : "pr-3",
            active ? "bg-[color:var(--bg-2)]" : "hover:bg-[color:var(--bg-3)]",
            pressing ? "scale-[0.985] bg-[color:var(--bg-2)]" : "",
          ].join(" ")}
        >
          <span className="ml-1 min-w-0 flex-1 truncate select-none">{title}</span>

          {(hovered || pinPending) && (
            <span className="pointer-events-none absolute right-9 top-1 bottom-1 hidden w-8 bg-gradient-to-l from-[color:var(--bg-2)]/70 to-transparent md:block" />
          )}
        </button>

        {/* Mobile pinned indicator: visible, but not clickable */}
        {pinned ? (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 md:hidden pointer-events-none">
            <span
              className={[
                "inline-flex h-7 w-7 items-center justify-center rounded-full border",
                "border-[color:var(--border-0)] bg-[color:var(--bg-1)]/92 backdrop-blur-sm",
                "text-[color:var(--accent)] brightness-125 shadow-[0_0_0_1px_rgba(94,124,226,0.10)]",
              ].join(" ")}
              aria-hidden="true"
            >
              <PinIcon filled />
            </span>
          </div>
        ) : null}

        {/* Desktop clickable pin control */}
        <div
          className={[
            "absolute right-2 top-1/2 hidden -translate-y-1/2 transition-all duration-200 md:block",
            showDesktopPinControl
              ? "opacity-100 scale-100"
              : "opacity-0 scale-95 pointer-events-none",
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

        {menuOpen ? (
          <div
            className={[
              "absolute right-2 z-30 md:hidden",
              openUpward ? "bottom-full mb-2" : "top-full mt-2",
            ].join(" ")}
          >
            <ActionMenu>
              <ActionMenuItem
                onClick={handleMenuPinClick}
                label={pinned ? "Unpin" : "Pin"}
                icon={
                  pinned ? (
                    <span className="text-[color:var(--accent)]">
                      <PinOffIcon />
                    </span>
                  ) : (
                    <span className="text-[color:var(--text-1)]">
                      <PinIcon filled={false} />
                    </span>
                  )
                }
              />
            </ActionMenu>
          </div>
        ) : null}
      </div>
    );
  },
);
