"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { MessageList } from "@/components/chat/MessageList";
import { Composer } from "@/components/chat/Composer";
import { useAuth } from "@/context/AuthContext";
import { listConversations } from "@/lib/conversations";

type Participant = { id: string; name: string };

type Msg = {
  id: string;
  senderId: string;
  senderName: string;
  role: "rhea" | "user" | "teammate";
  content: string;
};

type Conversation = { id: string; title: string; updatedAt?: string };

function normalizeConversationTitle(c: any) {
  // backend might return title, name, or empty
  return (
    c.title ||
    c.name ||
    c.subject ||
    "Untitled"
  );
}

function normalizeUpdatedAt(c: any) {
  return c.updatedAt || c.updated_at || c.updatedAtIso || c.updated_at_iso;
}

export function ChatShell() {
  const { state } = useAuth();
  const token = state.status === "authed" ? state.token : null;
  const me = state.status === "authed" ? state.me : null;

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // conversations from backend
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);

  // active selection: null means "home/welcome"
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null
  );

  // messages by conversation id (we'll wire to GET /messages later)
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, Msg[]>
  >({});

  const participants: Participant[] = useMemo(() => {
    // Only show Participants UI when >1 (you asked for this)
    // Right now: just "You". Later: from conversation members API.
    return [{ id: "me", name: "You" }];
  }, []);

  useEffect(() => {
    if (!token) return;
    let alive = true;

    setLoadingConvs(true);
    listConversations(token)
      .then((rows) => {
        if (!alive) return;
        const mapped: Conversation[] = (rows ?? []).map((c: any) => ({
          id: c.id,
          title: normalizeConversationTitle(c),
          updatedAt: normalizeUpdatedAt(c),
        }));
        // optional: sort by updatedAt desc if present
        mapped.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
        setConversations(mapped);

        // stay on "welcome" until user selects one
        // or auto-select the most recent if you prefer:
        // if (mapped.length > 0) setActiveConversationId(mapped[0].id);
      })
      .catch(() => {
        if (!alive) return;
        setConversations([]);
      })
      .finally(() => alive && setLoadingConvs(false));

    return () => {
      alive = false;
    };
  }, [token]);

  function onSelectConversation(id: string) {
    setActiveConversationId(id);
    setSidebarOpen(false);

    // later: fetch messages for that id
    // for now: ensure we at least have an array
    setMessagesByConversation((prev) => ({ ...prev, [id]: prev[id] ?? [] }));
  }

  function createConversationLocal() {
    // Until backend has POST /v1/conversations, we create a local stub.
    // When backend exists, swap this to API call and refresh list.
    const id = crypto.randomUUID();
    const title = "New conversation";

    setConversations((prev) => [{ id, title, updatedAt: new Date().toISOString() }, ...prev]);
    setMessagesByConversation((prev) => ({ ...prev, [id]: [] }));
    setActiveConversationId(id);
    setSidebarOpen(false);
  }

  function onSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    // If user is on welcome page, route them into a new local conversation
    let convId = activeConversationId;
    if (!convId) {
      createConversationLocal();
      // state update is async; generate a conv id ourselves instead:
      // simplest: createConversationLocal already made one, but we don’t have it here.
      // So: do it inline so we can append message reliably.
      const id = crypto.randomUUID();
      const title = "New conversation";
      setConversations((prev) => [{ id, title, updatedAt: new Date().toISOString() }, ...prev]);
      setMessagesByConversation((prev) => ({ ...prev, [id]: [] }));
      setActiveConversationId(id);
      convId = id;
    }

    const msg: Msg = {
      id: crypto.randomUUID(),
      senderId: "me",
      senderName: "You",
      role: "user",
      content: trimmed,
    };

    setMessagesByConversation((prev) => ({
      ...prev,
      [convId!]: [...(prev[convId!] ?? []), msg],
    }));

    // later:
    // - POST /v1/chat or /v1/chat/stream with conversation_id
    // - stream assistant message into messagesByConversation[convId]
    // - update conversation title based on first user message
  }

  const activeMessages =
    activeConversationId ? messagesByConversation[activeConversationId] ?? [] : [];

  const activeTitle = activeConversationId
    ? conversations.find((c) => c.id === activeConversationId)?.title ?? "Conversation"
    : "RHEA Index";

  return (
    <div className="h-screen w-screen overflow-hidden">
      <div className="flex h-full w-full">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={onSelectConversation}
          onCreateConversation={createConversationLocal}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            title={activeTitle}
            participants={participants}
            onOpenSidebar={() => setSidebarOpen(true)}
            onNewConversation={createConversationLocal} // mobile: show New on topbar
          />

          {/* MAIN */}
          <main className="min-w-0 flex-1 overflow-y-auto px-4 py-6 md:px-6">
            <div className="mx-auto w-full max-w-3xl">
              {!activeConversationId ? (
                <WelcomeComposer
                  userName={me?.user_name || me?.email || "there"}
                  loadingConvs={loadingConvs}
                  conversationCount={conversations.length}
                  onSend={onSend}
                />
              ) : activeMessages.length === 0 ? (
                <ConversationEmptyHint />
              ) : (
                <>
                  <MessageList messages={activeMessages} />
                  <div className="h-6" />
                </>
              )}
            </div>
          </main>

          {/* Bottom composer only when inside a conversation */}
          {activeConversationId ? (
            <div className="border-t border-[color:var(--border-0)] bg-[color:var(--bg-0)] px-4 py-3 md:px-6">
              <div className="mx-auto w-full max-w-3xl">
                <Composer participants={participants} onSend={onSend} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function WelcomeComposer(props: {
  userName: string;
  loadingConvs: boolean;
  conversationCount: number;
  onSend: (text: string) => void;
}) {
  return (
    <div className="pt-10 md:pt-14">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-0)] bg-[color:var(--bg-1)]/60 backdrop-blur-[6px] p-7">
          <div className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-2)]">
            RHEA Index
          </div>

          <div className="mt-2 text-[22px] font-medium text-[color:var(--text-0)]">
            Welcome, <span className="text-[color:var(--text-0)]">{props.userName}</span>.
          </div>

          <div className="mt-2 text-sm text-[color:var(--text-1)] max-w-[68ch]">
            What are we learning today? Ask a question, paste notes, or start a thread.
            RHEA keeps your thinking organized — conversations that become a notebook.
          </div>

          <div className="mt-4 text-xs text-[color:var(--text-2)]">
            {props.loadingConvs
              ? "Syncing your conversations…"
              : props.conversationCount > 0
              ? `You have ${props.conversationCount} conversation${props.conversationCount > 1 ? "s" : ""} in the sidebar.`
              : "No conversations yet — start with a prompt below."}
          </div>

          {/* Centered composer (unique vs ChatGPT/Gemini: glass card + tighter) */}
          <div className="mt-6">
            <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-0)] bg-[color:var(--bg-0)]/55 backdrop-blur-[10px] p-3">
              <Composer participants={[]} onSend={props.onSend} />
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Hint title="Try a build question" text="“Explain RAG like I’m implementing it in Go.”" />
            <Hint title="Try a learning loop" text="“Ask me 3 questions to test my understanding of X.”" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Hint(props: { title: string; text: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[color:var(--border-0)] bg-[color:var(--bg-0)]/50 p-3">
      <div className="text-xs font-medium text-[color:var(--text-2)]">{props.title}</div>
      <div className="mt-1 text-sm text-[color:var(--text-1)]">{props.text}</div>
    </div>
  );
}

function ConversationEmptyHint() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-0)] bg-[color:var(--bg-1)] p-6">
      <div className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-2)]">
        Conversation
      </div>
      <div className="mt-2 text-lg font-medium text-[color:var(--text-0)]">
        Start the thread
      </div>
      <div className="mt-2 text-sm text-[color:var(--text-1)]">
        Ask something, paste notes, or @mention collaborators later. Your first message can become
        the title automatically once we wire the backend.
      </div>
    </div>
  );
}