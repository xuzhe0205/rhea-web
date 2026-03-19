"use client";

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
  token,
  conversationId,
}: {
  messages: Msg[];
  token: string | null;
  conversationId: string | null;
}) {
  return (
    <div className="space-y-4">
      {messages.map((msg) => (
        <MessageBlock
          key={msg.id}
          msg={msg}
          token={token}
          conversationId={conversationId}
        />
      ))}
    </div>
  );
}