"use client";

import type { AnnotationDTO } from "@/lib/annotations";
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
  onToggleFavorite,
  togglingFavoriteId,
  onCreateHighlight,
  onRemoveHighlightRange,
  onSelectionToolbarVisibleChange,
  mobileFooterOffset,
}: {
  messages: Msg[];
  annotationsByMessageId: Record<string, AnnotationDTO[]>;
  onToggleFavorite?: (messageId: string, nextValue: boolean) => Promise<void>;
  togglingFavoriteId?: string | null;
  onCreateHighlight: (messageId: string, range: { start: number; end: number }) => Promise<void>;
  onRemoveHighlightRange: (
    messageId: string,
    range: { start: number; end: number },
  ) => Promise<void>;
  onSelectionToolbarVisibleChange?: (visible: boolean) => void;
  mobileFooterOffset?: number;
}) {
  return (
    <div className="space-y-4">
      {messages.map((msg) => {
        const isFavorite = !!msg.isFavorite;
        const isBusy = togglingFavoriteId === msg.id;

        return (
          <div key={msg.id} id={`msg-${msg.id}`}>
            <MessageBlock
              msg={msg}
              annotations={annotationsByMessageId[msg.id] ?? []}
              isFavorite={!!msg.isFavorite}
              favoriteBusy={togglingFavoriteId === msg.id}
              onToggleFavorite={() => onToggleFavorite?.(msg.id, !msg.isFavorite)}
              onCreateHighlight={(range) => onCreateHighlight(msg.id, range)}
              onRemoveHighlightRange={(range) => onRemoveHighlightRange(msg.id, range)}
              onSelectionToolbarVisibleChange={onSelectionToolbarVisibleChange}
              mobileFooterOffset={mobileFooterOffset}
            />
          </div>
        );
      })}
    </div>
  );
}

function BookmarkIcon({ filled, busy }: { filled?: boolean; busy?: boolean }) {
  if (busy) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" className="animate-pulse">
        <path
          d="M7 4.75C7 4.33579 7.33579 4 7.75 4H16.25C16.6642 4 17 4.33579 17 4.75V19L12 15.75L7 19V4.75Z"
          fill="currentColor"
          opacity="0.55"
        />
      </svg>
    );
  }

  if (filled) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7 4.75C7 4.33579 7.33579 4 7.75 4H16.25C16.6642 4 17 4.33579 17 4.75V19L12 15.75L7 19V4.75Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 4.75C7 4.33579 7.33579 4 7.75 4H16.25C16.6642 4 17 4.33579 17 4.75V19L12 15.75L7 19V4.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
