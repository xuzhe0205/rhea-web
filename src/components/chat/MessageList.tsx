"use client";

import type { AnnotationDTO } from "@/lib/annotations";
import { MessageBlock } from "@/components/chat/MessageBlock";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  status?: "streaming" | "done" | "error";
};

export function MessageList({
  messages,
  annotationsByMessageId,
  onCreateHighlight,
  onRemoveHighlightRange,
  onSelectionToolbarVisibleChange,
  mobileFooterOffset,
}: {
  messages: Msg[];
  annotationsByMessageId: Record<string, AnnotationDTO[]>;
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
      {messages.map((msg) => (
        <MessageBlock
          key={msg.id}
          msg={msg}
          annotations={annotationsByMessageId[msg.id] ?? []}
          onCreateHighlight={(range) => onCreateHighlight(msg.id, range)}
          onRemoveHighlightRange={(range) => onRemoveHighlightRange(msg.id, range)}
          onSelectionToolbarVisibleChange={onSelectionToolbarVisibleChange}
          mobileFooterOffset={mobileFooterOffset}
        />
      ))}
    </div>
  );
}