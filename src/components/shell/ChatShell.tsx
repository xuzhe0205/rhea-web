"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { MessageList } from "@/components/chat/MessageList";
import { Composer } from "@/components/chat/Composer";
import { useAuth } from "@/context/AuthContext";
import { listConversations } from "@/lib/conversations";
import { listConversationMessages } from "@/lib/messages";

type Participant = { id: string; name: string };

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

type Conversation = {
  id: string;
  title: string;
  updatedAt?: string;
};

function normalizeConversationTitle(c: any) {
  return c.title || c.name || c.subject || "Untitled";
}

function normalizeUpdatedAt(c: any) {
  return c.updatedAt || c.updated_at || c.updatedAtIso || c.updated_at_iso;
}

function normalizeMessage(m: any): Msg {
  return {
    id: m.id,
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content || "",
    createdAt: m.created_at || m.createdAt,
  };
}

function sortMessagesAsc(xs: Msg[]) {
  return [...xs].sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
}

export function ChatShell() {
  const router = useRouter();
  const params = useParams();

  const { state } = useAuth();
  const token = state.status === "authed" ? state.token : null;
  const me = state.status === "authed" ? state.me : null;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);

  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, Msg[]>
  >({});
  const [loadingMessagesFor, setLoadingMessagesFor] = useState<string | null>(null);

  const threadRef = useRef<HTMLDivElement | null>(null);

  const participants: Participant[] = useMemo(() => [{ id: "me", name: "You" }], []);

  const activeConversationId =
    typeof params?.id === "string" ? params.id : null;

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

        mapped.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
        setConversations(mapped);
      })
      .catch(() => {
        if (!alive) return;
        setConversations([]);
      })
      .finally(() => {
        if (alive) setLoadingConvs(false);
      });

    return () => {
      alive = false;
    };
  }, [token]);

  useEffect(() => {
    if (!activeConversationId) return;
    if (!token) return;

    void loadConversationMessages(activeConversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, token]);

  async function loadConversationMessages(conversationId: string) {
    if (!token) return;

    setLoadingMessagesFor(conversationId);

    try {
      const rows = await listConversationMessages(token, conversationId, 50);
      const mapped = sortMessagesAsc((rows ?? []).map(normalizeMessage));

      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: mapped,
      }));

      requestAnimationFrame(() => {
        const el = threadRef.current;
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      });
    } catch {
      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: [],
      }));
    } finally {
      setLoadingMessagesFor((curr) => (curr === conversationId ? null : curr));
    }
  }

  function onSelectConversation(id: string) {
    router.push(`/c/${id}`);
    setSidebarOpen(false);
  }

  function createConversationLocal() {
    const id = crypto.randomUUID();
    const title = "New conversation";

    setConversations((prev) => [
      { id, title, updatedAt: new Date().toISOString() },
      ...prev,
    ]);

    setMessagesByConversation((prev) => ({
      ...prev,
      [id]: [],
    }));

    router.push(`/c/${id}`);
    setSidebarOpen(false);
  }

  function onSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    let convId = activeConversationId;

    if (!convId) {
      const id = crypto.randomUUID();
      const title = "New conversation";

      setConversations((prev) => [
        { id, title, updatedAt: new Date().toISOString() },
        ...prev,
      ]);

      setMessagesByConversation((prev) => ({
        ...prev,
        [id]: [],
      }));

      router.push(`/c/${id}`);
      convId = id;
    }

    const msg: Msg = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessagesByConversation((prev) => ({
      ...prev,
      [convId!]: [...(prev[convId!] ?? []), msg],
    }));

    requestAnimationFrame(() => {
      const el = threadRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });

    // later:
    // POST /v1/chat or /v1/chat/stream with conversation_id
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
            onNewConversation={createConversationLocal}
          />

          {!activeConversationId ? (
            <main className="min-w-0 flex-1 overflow-y-auto px-4 py-6 md:px-6">
              <div className="mx-auto w-full max-w-3xl">
                <WelcomeComposer
                  userName={me?.user_name || me?.email || "there"}
                  loadingConvs={loadingConvs}
                  conversationCount={conversations.length}
                  onSend={onSend}
                />
              </div>
            </main>
          ) : (
            <>
              <div
                ref={threadRef}
                className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-6"
              >
                <div className="mx-auto w-full max-w-3xl">
                  {loadingMessagesFor === activeConversationId ? (
                    <MessagesLoadingState />
                  ) : activeMessages.length === 0 ? (
                    <ConversationEmptyHint />
                  ) : (
                    <>
                      <MessageList messages={activeMessages} />
                      <div className="h-6" />
                    </>
                  )}
                </div>
              </div>

              <div className="border-t border-[color:var(--border-0)] bg-[color:var(--bg-0)] px-4 py-3 md:px-6">
                <div className="mx-auto w-full max-w-3xl">
                  <Composer participants={participants} onSend={onSend} />
                </div>
              </div>
            </>
          )}
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
        <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-0)] bg-[color:var(--bg-1)]/60 p-7 backdrop-blur-[6px]">
          <div className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-2)]">
            RHEA Index
          </div>

          <div className="mt-2 text-[22px] font-medium text-[color:var(--text-0)]">
            Welcome, <span>{props.userName}</span>.
          </div>

          <div className="mt-2 max-w-[68ch] text-sm text-[color:var(--text-1)]">
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

          <div className="mt-6 rounded-[var(--radius-lg)] border border-[color:var(--border-0)] bg-[color:var(--bg-0)]/55 p-3 backdrop-blur-[10px]">
            <Composer participants={[]} onSend={props.onSend} />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Hint
              title="Try a build question"
              text="“Explain RAG like I’m implementing it in Go.”"
            />
            <Hint
              title="Try a learning loop"
              text="“Ask me 3 questions to test my understanding of X.”"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MessagesLoadingState() {
  return (
    <div className="space-y-3">
      <SkeletonMessage />
      <SkeletonMessage wide />
      <SkeletonMessage />
    </div>
  );
}

function SkeletonMessage({ wide }: { wide?: boolean }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-0)] bg-[color:var(--bg-1)] p-4">
      <div className="mb-3 h-3 w-20 rounded bg-[color:var(--bg-3)]" />
      <div
        className={`h-3 rounded bg-[color:var(--bg-3)] ${
          wide ? "w-[90%]" : "w-[70%]"
        }`}
      />
      <div className="mt-2 h-3 w-[55%] rounded bg-[color:var(--bg-3)]" />
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
        Ask something, paste notes, or continue building your thinking here. Older messages will be
        paginated upward once we add infinite scroll.
      </div>
    </div>
  );
}