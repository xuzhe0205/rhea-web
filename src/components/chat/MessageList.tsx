"use client";

import type { AnnotationDTO } from "@/lib/annotations";
import type { CommentThreadDTO } from "@/lib/comments";
import { MessageBlock } from "@/components/chat/MessageBlock";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  isFavorite?: boolean;
  status?: "streaming" | "done" | "error";
};

export function MessageList({
  messages,
  annotationsByMessageId,
  commentThreadsByMessageId,
  onToggleFavorite,
  togglingFavoriteId,
  onCreateHighlight,
  onRemoveHighlightRange,
  onCreateComment,
  onOpenCommentThread,
  onSelectionToolbarVisibleChange,
  mobileFooterOffset,
}: {
  messages: Msg[];
  annotationsByMessageId: Record<string, AnnotationDTO[]>;
  commentThreadsByMessageId: Record<string, CommentThreadDTO[]>;
  onToggleFavorite?: (messageId: string, nextValue: boolean) => Promise<void>;
  togglingFavoriteId?: string | null;
  onCreateHighlight: (messageId: string, range: { start: number; end: number }) => Promise<void>;
  onRemoveHighlightRange: (
    messageId: string,
    range: { start: number; end: number },
  ) => Promise<void>;
  onCreateComment: (
    messageId: string,
    range: { start: number; end: number },
    selectedTextSnapshot: string,
  ) => Promise<void>;
  onOpenCommentThread: (threadId: string) => void;
  onSelectionToolbarVisibleChange?: (visible: boolean) => void;
  mobileFooterOffset?: number;
}) {
  return (
    <div className="space-y-4">
      {messages.map((msg) => (
        <div key={msg.id} id={`msg-${msg.id}`}>
          <MessageBlock
            msg={msg}
            annotations={annotationsByMessageId[msg.id] ?? []}
            commentThreads={commentThreadsByMessageId[msg.id] ?? []}
            isFavorite={!!msg.isFavorite}
            favoriteBusy={togglingFavoriteId === msg.id}
            onToggleFavorite={() => onToggleFavorite?.(msg.id, !msg.isFavorite)}
            onCreateHighlight={(range) => onCreateHighlight(msg.id, range)}
            onRemoveHighlightRange={(range) => onRemoveHighlightRange(msg.id, range)}
            onCreateComment={(range, selectedTextSnapshot) =>
              onCreateComment(msg.id, range, selectedTextSnapshot)
            }
            onOpenCommentThread={onOpenCommentThread}
            onSelectionToolbarVisibleChange={onSelectionToolbarVisibleChange}
            mobileFooterOffset={mobileFooterOffset}
          />
        </div>
      ))}
    </div>
  );
}
