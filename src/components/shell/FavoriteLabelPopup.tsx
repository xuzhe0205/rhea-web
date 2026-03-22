"use client";

import { useEffect, useRef, useState } from "react";

export function FavoriteLabelPopup(props: {
  open: boolean;
  initialValue?: string;
  previewText?: string;
  saving?: boolean;
  onClose: () => void;
  onSave: (value: string) => Promise<void> | void;
}) {
  const [value, setValue] = useState(props.initialValue ?? "");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!props.open) return;
    setValue(props.initialValue ?? "");

    const t = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 30);

    return () => window.clearTimeout(t);
  }, [props.open, props.initialValue]);

  useEffect(() => {
    if (!props.open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        props.onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [props.open, props.onClose]);

  if (!props.open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await props.onSave(value.trim());
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]"
        onClick={props.onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 md:inset-0 md:flex md:items-center md:justify-center md:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="favorite-label-title"
          className={[
            "w-full overflow-hidden border border-[color:var(--border-0)]",
            "bg-[color:var(--bg-1)] shadow-[0_18px_60px_rgba(0,0,0,0.42)]",
            "rounded-t-[22px] md:max-w-md md:rounded-[22px]",
          ].join(" ")}
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleSubmit}>
            <div className="px-4 pb-3 pt-4 md:px-5 md:pb-4 md:pt-5">
              <div className="mb-1 text-[13px] font-medium tracking-[0.16em] text-[color:var(--accent)]/85">
                FAVORITE
              </div>

              <h2
                id="favorite-label-title"
                className="text-[20px] font-semibold tracking-[-0.02em] text-[color:var(--text-0)]"
              >
                Add a label
              </h2>

              <p className="mt-1 text-sm leading-6 text-[color:var(--text-2)]">
                Help future-you remember why this saved message matters.
              </p>

              {props.previewText ? (
                <div className="mt-3 rounded-[16px] border border-[color:var(--border-0)] bg-[color:var(--bg-2)] px-3 py-2 text-sm text-[color:var(--text-1)]">
                  <div className="line-clamp-2">{props.previewText}</div>
                </div>
              ) : null}

              <div className="mt-4">
                <label
                  htmlFor="favorite-label-input"
                  className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--text-2)]"
                >
                  Label
                </label>
                <input
                  id="favorite-label-input"
                  ref={inputRef}
                  type="text"
                  maxLength={80}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className={[
                    "rhea-focus w-full rounded-[14px] border border-[color:var(--border-0)]",
                    "bg-[color:var(--bg-0)] px-3.5 py-3 text-sm text-[color:var(--text-0)]",
                  ].join(" ")}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[color:var(--border-0)] px-4 py-3 md:px-5">
              <button
                type="button"
                onClick={props.onClose}
                className="inline-flex h-10 items-center rounded-[12px] px-4 text-sm text-[color:var(--text-1)] transition hover:bg-[color:var(--bg-3)] hover:text-[color:var(--text-0)]"
              >
                Skip
              </button>

              <button
                type="submit"
                disabled={!!props.saving}
                className={[
                  "inline-flex h-10 items-center rounded-[12px] border border-[color:var(--border-0)]",
                  "bg-[color:var(--bg-2)] px-4 text-sm text-[color:var(--text-0)] transition",
                  "hover:bg-[color:var(--bg-3)] disabled:cursor-not-allowed disabled:opacity-60",
                ].join(" ")}
              >
                {props.saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
