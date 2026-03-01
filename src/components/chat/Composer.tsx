"use client";

import { useMemo, useRef, useState } from "react";

type Participant = { id: string; name: string };

export function Composer({
  participants,
  onSend,
}: {
  participants: Participant[];
  onSend: (text: string) => void;
}) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const mentionOptions = useMemo(() => {
    const rhea = participants.find((p) => p.id === "rhea");
    const rest = participants.filter((p) => p.id !== "rhea" && p.id !== "me");
    const opts = [...(rhea ? [rhea] : []), ...rest];
    return opts.map((p) => ({
      id: p.id,
      label: `@${p.name.toLowerCase()}`,
      name: p.name,
    }));
  }, [participants]);

  function insertMention(label: string) {
    const el = inputRef.current;
    if (!el) return;

    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;

    const before = value.slice(0, start);
    const after = value.slice(end);
    const atPos = before.lastIndexOf("@");

    const newText =
      atPos >= 0
        ? before.slice(0, atPos) + label + " " + after
        : before + label + " " + after;

    setValue(newText);
    setOpen(false);

    requestAnimationFrame(() => {
      const pos = (atPos >= 0 ? atPos : start) + label.length + 1;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, mentionOptions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const opt = mentionOptions[activeIdx];
        if (opt) insertMention(opt.label);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend(value);
      setValue("");
      return;
    }
  }

  function handleChange(v: string) {
    setValue(v);

    const el = inputRef.current;
    const caret = el?.selectionStart ?? v.length;
    const before = v.slice(0, caret);
    const lastAt = before.lastIndexOf("@");

    const shouldOpen =
      lastAt >= 0 && (lastAt === 0 || /\s/.test(before[lastAt - 1] ?? " "));

    setOpen(shouldOpen);
    if (shouldOpen) setActiveIdx(0);
  }

  return (
    <div className="relative">
      {open ? (
        <div className="absolute bottom-[calc(100%+10px)] left-0 w-full rounded-[var(--radius-lg)] border border-[color:var(--border-0)] bg-[color:var(--bg-2)] p-1">
          <div className="px-2 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--text-2)]">
            Mention
          </div>

          {mentionOptions.map((opt, idx) => (
            <button
              key={opt.id}
              type="button"
              className={[
                "flex w-full items-center justify-between rounded-[var(--radius-md)] px-2 py-2 text-left text-sm transition",
                idx === activeIdx
                  ? "bg-[color:var(--bg-3)] text-[color:var(--text-0)]"
                  : "text-[color:var(--text-1)] hover:bg-[color:var(--bg-3)] hover:text-[color:var(--text-0)]",
              ].join(" ")}
              onMouseEnter={() => setActiveIdx(idx)}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur
                insertMention(opt.label);
              }}
            >
              <span className="font-medium">{opt.label}</span>
              <span className="text-xs text-[color:var(--text-2)]">
                {opt.name}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-2 rounded-[var(--radius-lg)] border border-[color:var(--border-0)] bg-[color:var(--bg-1)] p-2">
        <textarea
          ref={inputRef}
          className="rhea-focus min-h-[44px] max-h-[160px] flex-1 resize-none rounded-[var(--radius-md)] border border-transparent bg-transparent px-3 py-2 text-[14px] leading-6 text-[color:var(--text-0)] placeholder:text-[color:var(--text-2)]"
          placeholder="Ask RHEA… (type @ to mention)"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <button
          className="rhea-focus inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border-0)] bg-[color:var(--bg-2)] px-3 text-sm font-medium text-[color:var(--text-0)] hover:bg-[color:var(--bg-3)] transition"
          type="button"
          onClick={() => {
            onSend(value);
            setValue("");
          }}
          aria-label="Send"
          title="Send"
        >
          Send
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-[color:var(--text-2)]">
        <span>Enter to send • Shift+Enter for newline</span>
        <span className="hidden sm:inline">RHEA Index</span>
      </div>
    </div>
  );
}