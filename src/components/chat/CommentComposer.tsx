"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function CommentComposer({
  open,
  mobile,
  selectedText,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mobile?: boolean;
  selectedText: string;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (content: string) => Promise<void>;
}) {
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setDraft("");
    }
  }, [open, selectedText]);

  if (!mounted || !open) return null;

  const disabled = !draft.trim() || submitting;

  const body = (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/[0.08] px-4 py-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/42">
          Add comment
        </div>

        <div className="mt-2 rounded-2xl border border-white/[0.06] bg-white/[0.04] px-3 py-2.5">
          <div className="line-clamp-3 text-[14px] font-medium leading-5 text-white/88">
            “{selectedText}”
          </div>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="rounded-[22px] border border-white/[0.06] bg-black/18 p-2.5">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write your comment…"
            rows={mobile ? 4 : 5}
            maxLength={500}
            className="w-full resize-none bg-transparent px-1.5 py-1 text-[14px] leading-5 text-white/92 outline-none placeholder:text-white/28"
          />

          <div className="mt-2 flex items-center justify-between">
            <div className="text-[11px] text-white/35">{draft.trim().length} / 500</div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-3 py-1.5 text-[13px] font-medium text-white/58 transition hover:bg-white/[0.04] hover:text-white/82"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  const value = draft.trim();
                  if (!value) return;
                  void onSubmit(value).then(() => setDraft(""));
                }}
                className="rounded-xl bg-[rgba(98,118,214,0.78)] px-3 py-1.5 text-[13px] font-medium text-white transition hover:bg-[rgba(112,132,232,0.9)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (mobile) {
    return createPortal(
      <div className="fixed inset-0 z-[10010] md:hidden">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(22,24,31,0.985),rgba(14,16,22,0.99))] shadow-[0_-20px_60px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.03)]">
          {body}
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="hidden md:block">
      <div className="fixed inset-0 z-[10000] bg-black/36" onClick={onClose} />
      <div className="fixed inset-0 z-[10001] flex items-center justify-center px-6">
        <div
          className="w-full max-w-[460px] overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(28,30,36,0.99),rgba(18,20,26,0.995))] shadow-[0_30px_90px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.03)]"
          onClick={(e) => e.stopPropagation()}
        >
          {body}
        </div>
      </div>
    </div>,
    document.body,
  );
}
