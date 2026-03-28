"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { CommentThreadDTO } from "@/lib/comments";

export function CommentThreadPanel({
  thread,
  open,
  mobile,
  onClose,
  onSubmit,
  submitting,
  onDeleteComment,
  deletingCommentId,
}: {
  thread: CommentThreadDTO | null;
  open: boolean;
  mobile?: boolean;
  onClose: () => void;
  onSubmit: (content: string) => Promise<void>;
  submitting?: boolean;
  onDeleteComment?: (commentId: string) => Promise<void>;
  deletingCommentId?: string | null;
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
  }, [open, thread?.id]);

  const disabled = !draft.trim() || submitting;

  const body = useMemo(() => {
    if (!thread) return null;

    return (
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b border-white/[0.06] px-4 py-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/42">
            Comment thread
          </div>

          <div className="mt-2 rounded-2xl border border-white/[0.04] bg-black/22 px-3 py-2.5">
            <div className="line-clamp-2 text-[14px] font-medium leading-5 text-white/92">
              “{thread.selected_text_snapshot}”
            </div>
          </div>
        </div>

        {/* Thread body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-2.5">
            {(thread.comments ?? []).map((comment) => (
              <div
                key={comment.id}
                className={[
                  "rounded-[20px] border px-3.5 py-3",
                  "border-white/[0.06] bg-white/[0.025]",
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]",
                ].join(" ")}
              >
                <div className="text-[14px] leading-5 text-white/92">{comment.content}</div>

                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="text-[11px] leading-4 text-white/42">
                    {new Date(comment.created_at).toLocaleString()}
                  </div>

                  {onDeleteComment ? (
                    <button
                      type="button"
                      onClick={() => void onDeleteComment(comment.id)}
                      disabled={deletingCommentId === comment.id}
                      className={[
                        "rounded-lg px-1.5 py-1 text-[12px] font-medium",
                        "text-white/40 transition hover:text-red-300",
                        "disabled:opacity-50",
                      ].join(" ")}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-white/[0.06] px-3 py-3">
          <div className="rounded-[22px] border border-white/[0.06] bg-black/20 p-2.5">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a comment…"
              rows={4}
              maxLength={500}
              className={[
                "w-full resize-none bg-transparent px-1.5 py-1 text-[14px] leading-5 text-white/92 outline-none",
                "placeholder:text-white/30",
              ].join(" ")}
            />

            <div className="mt-2 flex items-center justify-between">
              <div className="text-[11px] text-white/35">{draft.trim().length} / 500</div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={[
                    "rounded-xl px-3 py-1.5 text-[13px] font-medium",
                    "text-white/58 transition hover:bg-white/[0.04] hover:text-white/82",
                  ].join(" ")}
                >
                  Close
                </button>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    const value = draft.trim();
                    if (!value) return;
                    void onSubmit(value).then(() => setDraft(""));
                  }}
                  className={[
                    "rounded-xl px-3 py-1.5 text-[13px] font-medium",
                    "bg-[rgba(110,136,255,0.72)] text-white",
                    "transition hover:bg-[rgba(126,150,255,0.84)]",
                    "disabled:cursor-not-allowed disabled:opacity-45",
                  ].join(" ")}
                >
                  Reply
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [thread, draft, disabled, onClose, onDeleteComment, onSubmit, deletingCommentId]);

  if (!mounted || !open || !thread) return null;

  if (mobile) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] md:hidden">
        <div className="absolute inset-0 bg-black/45" onClick={onClose} />

        <div
          className={[
            "absolute inset-x-0 bottom-0 h-[68vh] overflow-hidden rounded-t-[28px]",
            "border border-white/[0.06]",
            "bg-[linear-gradient(180deg,rgba(16,20,31,0.98),rgba(11,14,24,0.98))]",
            "shadow-[0_-20px_60px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.03)]",
          ].join(" ")}
        >
          {body}
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="hidden md:block">
      <div className="fixed inset-0 z-[9997] bg-transparent" onClick={onClose} aria-hidden="true" />

      <div className="fixed inset-y-0 right-0 z-[9998] flex items-center pr-5">
        <aside
          className={[
            "flex h-[min(68vh,700px)] w-[min(332px,calc(100vw-40px))] flex-col overflow-hidden",
            "rounded-[26px] border border-white/[0.08]",
            "bg-[linear-gradient(180deg,rgba(24,26,32,0.985),rgba(16,18,24,0.985))]",
            "shadow-[0_24px_70px_rgba(0,0,0,0.42),0_0_0_1px_rgba(255,255,255,0.015)_inset]",
          ].join(" ")}
          onClick={(e) => e.stopPropagation()}
        >
          {body}
        </aside>
      </div>
    </div>,
    document.body,
  );
}
