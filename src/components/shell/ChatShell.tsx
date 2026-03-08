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
import { startChatStream } from "@/lib/chat-stream";

type Participant = { id: string; name: string };

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  status?: "streaming" | "done" | "error";
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
    status: "done",
  };
}

function sortMessagesAsc(xs: Msg[]) {
  return [...xs].sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
}

function mapConversations(rows: any[]): Conversation[] {
  const mapped: Conversation[] = (rows ?? []).map((c: any) => ({
    id: c.id,
    title: normalizeConversationTitle(c),
    updatedAt: normalizeUpdatedAt(c),
  }));

  mapped.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  return mapped;
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
  const [pendingMessages, setPendingMessages] = useState<Msg[]>([]);
  const [loadingMessagesFor, setLoadingMessagesFor] = useState<string | null>(null);
  const [streamingConversationId, setStreamingConversationId] = useState<string | null>(
    null,
  );

  const threadRef = useRef<HTMLDivElement | null>(null);

  const participants: Participant[] = useMemo(
    () => [
      { id: "me", name: "You" },
      { id: "rhea", name: "RHEA" },
    ],
    [],
  );

  const activeConversationId =
    typeof params?.id === "string" ? params.id : null;

  useEffect(() => {
    if (!token) return;
    void refreshConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!activeConversationId) return;
    if (!token) return;

    void loadConversationMessages(activeConversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, token]);

  useEffect(() => {
    requestAnimationFrame(() => {
      const el = threadRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [activeConversationId, messagesByConversation, pendingMessages]);

  async function refreshConversations() {
    if (!token) return [];

    setLoadingConvs(true);
    try {
      const rows = await listConversations(token);
      const mapped = mapConversations(rows ?? []);
      setConversations(mapped);
      return mapped;
    } catch {
      setConversations([]);
      return [];
    } finally {
      setLoadingConvs(false);
    }
  }

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
    if (streamingConversationId) return;
    router.push(`/c/${id}`);
    setSidebarOpen(false);
  }

  function createConversationLocal() {
    if (streamingConversationId) return;

    setPendingMessages([]);
    router.push("/");
    setSidebarOpen(false);
  }

  async function onSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !token) return;
    if (streamingConversationId) return;

    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const isNewConversation = !activeConversationId;
    const existingConversationIds = new Set(conversations.map((c) => c.id));

    if (isNewConversation) {
      setPendingMessages((prev) => [
        ...prev,
        {
          id: userMessageId,
          role: "user",
          content: trimmed,
          createdAt: nowIso,
          status: "done",
        },
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
          status: "streaming",
        },
      ]);
    } else {
      setStreamingConversationId(activeConversationId);

      setMessagesByConversation((prev) => {
        const current = prev[activeConversationId] ?? [];
        return {
          ...prev,
          [activeConversationId]: [
            ...current,
            {
              id: userMessageId,
              role: "user",
              content: trimmed,
              createdAt: nowIso,
              status: "done",
            },
            {
              id: assistantMessageId,
              role: "assistant",
              content: "",
              createdAt: new Date().toISOString(),
              status: "streaming",
            },
          ],
        };
      });
    }

    let resolvedConversationId: string | undefined;

    try {
      await startChatStream({
        token,
        body: isNewConversation
          ? { message: trimmed }
          : { message: trimmed, conversation_id: activeConversationId! },
        onEvent: (event) => {
          if (event.type === "meta" && event.conversationId) {
            resolvedConversationId = event.conversationId;

            if (isNewConversation) {
              setStreamingConversationId(event.conversationId);
              router.replace(`/c/${event.conversationId}`);
            }

            return;
          }

          if (event.type === "delta") {
            if (isNewConversation) {
              setPendingMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        content: m.content + event.text,
                        status: "streaming",
                      }
                    : m,
                ),
              );
            } else {
              setMessagesByConversation((prev) => {
                const current = prev[activeConversationId!] ?? [];
                return {
                  ...prev,
                  [activeConversationId!]: current.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          content: m.content + event.text,
                          status: "streaming",
                        }
                      : m,
                  ),
                };
              });
            }
            return;
          }

          if (event.type === "error") {
            if (isNewConversation) {
              setPendingMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        content:
                          m.content ||
                          "Sorry — something went wrong while streaming the response.",
                        status: "error",
                      }
                    : m,
                ),
              );
            } else {
              setMessagesByConversation((prev) => {
                const current = prev[activeConversationId!] ?? [];
                return {
                  ...prev,
                  [activeConversationId!]: current.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          content:
                            m.content ||
                            "Sorry — something went wrong while streaming the response.",
                          status: "error",
                        }
                      : m,
                  ),
                };
              });
            }
            return;
          }

          if (event.type === "done") {
            if (isNewConversation) {
              setPendingMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId ? { ...m, status: "done" } : m,
                ),
              );
            } else {
              setMessagesByConversation((prev) => {
                const current = prev[activeConversationId!] ?? [];
                return {
                  ...prev,
                  [activeConversationId!]: current.map((m) =>
                    m.id === assistantMessageId ? { ...m, status: "done" } : m,
                  ),
                };
              });
            }
          }
        },
      });

      const refreshed = await refreshConversations();

      if (isNewConversation) {
        let realConversationId = resolvedConversationId;

        if (!realConversationId) {
          const created = refreshed.find((c) => !existingConversationIds.has(c.id));
          realConversationId = created?.id;
        }

        if (realConversationId) {
          const finalConversationId = realConversationId;
          const finalPendingMessages = pendingMessages.length
            ? pendingMessages
            : undefined;

          setMessagesByConversation((prev) => {
            const alreadyExisting = prev[finalConversationId] ?? [];
            const pending = finalPendingMessages ?? [];
            return {
              ...prev,
              [finalConversationId]:
                alreadyExisting.length > 0 ? alreadyExisting : pending,
            };
          });

          setPendingMessages([]);
          router.replace(`/c/${finalConversationId}`);
          setStreamingConversationId(finalConversationId);
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send message.";

      if (isNewConversation) {
        setPendingMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content: message,
                  status: "error",
                }
              : m,
          ),
        );
      } else {
        setMessagesByConversation((prev) => {
          const current = prev[activeConversationId!] ?? [];
          return {
            ...prev,
            [activeConversationId!]: current.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content: message,
                    status: "error",
                  }
                : m,
            ),
          };
        });
      }
    } finally {
      if (isNewConversation && !resolvedConversationId) {
        setStreamingConversationId(null);
      }
    }
  }

  const activeMessages = activeConversationId
    ? messagesByConversation[activeConversationId] ?? []
    : pendingMessages;

  const activeTitle = activeConversationId
    ? conversations.find((c) => c.id === activeConversationId)?.title ?? "Conversation"
    : "RHEA Index";

  return (
    <div className="h-[100dvh] w-screen overflow-hidden">
      <div className="flex h-full w-full">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={onSelectConversation}
          onCreateConversation={createConversationLocal}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar
            title={activeTitle}
            participants={participants}
            onOpenSidebar={() => setSidebarOpen(true)}
            onNewConversation={createConversationLocal}
            />

          {!activeConversationId && pendingMessages.length === 0 ? (
            <main className="flex flex-1 items-center justify-center px-4 md:px-6">
              <div className="w-full max-w-3xl">
                <WelcomeComposer
                  userName={me?.user_name || me?.email || "there"}
                  onSend={onSend}
                  disabled={!!streamingConversationId}
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
                  {activeConversationId &&
                  loadingMessagesFor === activeConversationId &&
                  activeMessages.length === 0 ? (
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
                  <Composer
                    participants={participants}
                    onSend={onSend}
                    disabled={!!streamingConversationId && !activeConversationId}
                  />
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
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto max-w-3xl text-center">
        <div className="text-[20px] font-medium text-[color:var(--text-0)]">
          What would you like to explore today?
        </div>

        <div className="mt-6">
          <Composer
            participants={[]}
            onSend={props.onSend}
            disabled={props.disabled}
          />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Prompt
            text="Explain RAG like I'm implementing it in Go."
            onClick={() => props.onSend("Explain RAG like I'm implementing it in Go.")}
          />

          <Prompt
            text="Ask me 3 questions to test my understanding."
            onClick={() =>
              props.onSend("Ask me 3 questions to test my understanding.")
            }
          />
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

function Prompt(props: { text: string; onClick: () => void }) {
  return (
    <button
      onClick={props.onClick}
      className="w-full rounded-[var(--radius-md)] border border-[color:var(--border-0)] bg-[color:var(--bg-1)] px-4 py-3 text-left text-sm text-[color:var(--text-1)] transition hover:bg-[color:var(--bg-2)]"
    >
      {props.text}
    </button>
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
        Ask something, paste notes, or continue building your thinking here. Older
        messages will be paginated upward once we add infinite scroll.
      </div>
    </div>
  );
}