"use client";

import { useMemo, useState } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { MessageList } from "@/components/chat/MessageList";
import { Composer } from "@/components/chat/Composer";

type Participant = { id: string; name: string };
type Msg = {
  id: string;
  senderId: string;
  senderName: string;
  role: "rhea" | "user" | "teammate";
  content: string;
};

export function ChatShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const participants: Participant[] = useMemo(
    () => [
      { id: "rhea", name: "RHEA" },
      { id: "me", name: "You" },
      { id: "alex", name: "Alex" },
    ],
    []
  );

  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "m1",
      senderId: "rhea",
      senderName: "RHEA",
      role: "rhea",
      content:
        "Welcome to RHEA Index. Treat this thread as both a conversation and a notebook. You can @mention me or collaborators, and later you’ll be able to favorite, annotate, and share blocks.",
    },
    {
      id: "m2",
      senderId: "me",
      senderName: "You",
      role: "user",
      content:
        "Nice. I want a minimal, editorial-lab UI—collaboration-ready, but not a Slack clone.",
    },
    {
      id: "m3",
      senderId: "alex",
      senderName: "Alex",
      role: "teammate",
      content:
        "If we support sharing, I’d love tiny participant badges and clean @mentions. Maybe we can do group chat with AI via @rhea.",
    },
  ]);

  function onNewConversation() {
    setMessages([
      {
        id: crypto.randomUUID(),
        senderId: "rhea",
        senderName: "RHEA",
        role: "rhea",
        content:
          "New session started. Ask me anything — or @mention someone to bring them in.",
      },
    ]);
  }

  function onSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        senderId: "me",
        senderName: "You",
        role: "user",
        content: trimmed,
      },
      {
        id: crypto.randomUUID(),
        senderId: "rhea",
        senderName: "RHEA",
        role: "rhea",
        content:
          "Got it. Once we wire the backend, I’ll stream responses and you’ll see the assistant block fill progressively. Mentions will map cleanly to multi-agent / multi-user later.",
      },
    ]);
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <div className="flex h-full w-full">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            title="RHEA Session"
            participants={participants}
            onOpenSidebar={() => setSidebarOpen(true)}
            onNewConversation={onNewConversation}
          />

          <main className="min-w-0 flex-1 overflow-y-auto px-4 py-6 md:px-6">
            <div className="mx-auto w-full max-w-3xl">
              <MessageList messages={messages} />
              <div className="h-6" />
            </div>
          </main>

          <div className="border-t border-[color:var(--border-0)] bg-[color:var(--bg-0)] px-4 py-3 md:px-6">
            <div className="mx-auto w-full max-w-3xl">
              <Composer participants={participants} onSend={onSend} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}