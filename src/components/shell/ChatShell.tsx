"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { MessageList } from "@/components/chat/MessageList";
import { Composer } from "@/components/chat/Composer";
import { ModelBadge } from "@/components/chat/ModelBadge";
import { TokenBadge } from "@/components/chat/TokenBadge";
import { useAuth } from "@/context/AuthContext";
import { listConversations, patchConversationPin } from "@/lib/conversations";
import {
  listConversationMessages,
  listFavoriteMessages,
  listFavoriteJumpMessages,
  patchMessageFavorite,
  patchMessageFavoriteLabel,
  type FavoriteMessageDTO,
} from "@/lib/messages";
import { startChatStream } from "@/lib/chat-stream";
import { getConversationTokenSum } from "@/lib/conversation-token-sum";
import {
  createHighlightAnnotation,
  groupAnnotationsByMessageId,
  listConversationAnnotations,
  type AnnotationDTO,
  removeHighlightRange,
} from "@/lib/annotations";

import {
  applyOptimisticHighlightAdd,
  applyOptimisticHighlightRemove,
} from "@/components/chat/richtext/highlight-optimistic";

import { FavoriteLabelPopup } from "@/components/shell/FavoriteLabelPopup";

type Participant = { id: string; name: string };

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  isFavorite?: boolean;
  favoriteLabel?: string | null;
  status?: "streaming" | "done" | "error";
};

type Conversation = {
  id: string;
  title: string;
  updatedAt?: string;
  isPinned?: boolean;
  pinnedAt?: string | null;
};

type FavoriteItem = {
  id: string;
  conversationId: string;
  content: string;
  conversationTitle: string;
};

const PAGE_SIZE = 50;

function normalizeConversationTitle(c: any) {
  return c.title || c.name || c.subject || "Untitled";
}

function normalizeUpdatedAt(c: any) {
  return c.updatedAt || c.updated_at || c.updatedAtIso || c.updated_at_iso;
}

function normalizePinnedAt(c: any) {
  return c.pinnedAt || c.pinned_at || c.pinnedAtIso || c.pinned_at_iso || null;
}

function normalizeMessage(m: any): Msg {
  return {
    id: m.id,
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content || "",
    createdAt: m.created_at || m.createdAt,
    isFavorite: !!(m.is_favorite ?? m.isFavorite),
    favoriteLabel: m.favorite_label ?? m.favoriteLabel ?? null,
    status: "done",
  };
}

function sortConversations(items: Conversation[]) {
  return [...items].sort((a, b) => {
    const aPinned = !!a.isPinned;
    const bPinned = !!b.isPinned;

    if (aPinned !== bPinned) {
      return aPinned ? -1 : 1;
    }

    if (aPinned && bPinned) {
      const aPinnedAt = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
      const bPinnedAt = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
      if (aPinnedAt !== bPinnedAt) {
        return bPinnedAt - aPinnedAt;
      }
    }

    const aUpdated = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bUpdated = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bUpdated - aUpdated;
  });
}

function sortMessagesAsc(xs: Msg[]) {
  return [...xs].sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
}

function mapConversations(rows: any[]): Conversation[] {
  const mapped: Conversation[] = (rows ?? []).map((c: any) => ({
    id: c.id,
    title: normalizeConversationTitle(c),
    updatedAt: normalizeUpdatedAt(c),
    isPinned: !!(c.is_pinned ?? c.isPinned),
    pinnedAt: normalizePinnedAt(c),
  }));

  return sortConversations(mapped);
}

function getMessagePreview(content: string, maxLen = 48) {
  const plain = (content || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|\-|\*|\+)\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/(\*\*|__|\*|_|~~)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!plain) return "(empty message)";
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen).trimEnd()}…`;
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

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [togglingFavoriteId, setTogglingFavoriteId] = useState<string | null>(null);

  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, Msg[]>>({});

  const [pendingMessages, setPendingMessages] = useState<Msg[]>([]);
  const [loadingMessagesFor, setLoadingMessagesFor] = useState<string | null>(null);
  const [loadingOlderFor, setLoadingOlderFor] = useState<string | null>(null);
  const [hasMoreByConversation, setHasMoreByConversation] = useState<Record<string, boolean>>({});
  const [streamingConversationId, setStreamingConversationId] = useState<string | null>(null);

  const [selectedModelByConversation, setSelectedModelByConversation] = useState<
    Record<string, string>
  >({});
  const [pendingSelectedModel, setPendingSelectedModel] = useState<string | null>(null);

  const [tokenSumByConversation, setTokenSumByConversation] = useState<
    Record<string, number | null>
  >({});
  const [loadingTokenSumFor, setLoadingTokenSumFor] = useState<string | null>(null);

  const [annotationsByConversation, setAnnotationsByConversation] = useState<
    Record<string, Record<string, AnnotationDTO[]>>
  >({});

  const [favoriteLabelTarget, setFavoriteLabelTarget] = useState<{
    messageId: string;
    conversationId: string;
    previewText: string;
    initialLabel?: string | null;
  } | null>(null);

  const [savingFavoriteLabel, setSavingFavoriteLabel] = useState(false);

  const [mobileSelectionToolbarVisible, setMobileSelectionToolbarVisible] = useState(false);

  const footerRef = useRef<HTMLDivElement | null>(null);
  const [footerHeight, setFooterHeight] = useState(0);
  const pendingMessagesRef = useRef<Msg[]>([]);
  const pendingSelectedModelRef = useRef<string | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const paginationLockRef = useRef(false);

  useEffect(() => {
    pendingMessagesRef.current = pendingMessages;
  }, [pendingMessages]);

  useEffect(() => {
    pendingSelectedModelRef.current = pendingSelectedModel;
  }, [pendingSelectedModel]);

  const participants: Participant[] = useMemo(
    () => [
      { id: "me", name: "You" },
      { id: "rhea", name: "RHEA" },
    ],
    [],
  );

  const activeConversationId = typeof params?.id === "string" ? params.id : null;

  useEffect(() => {
    if (!token) return;
    void (async () => {
      const convs = await refreshConversations();
      await refreshFavorites(convs);
    })();
  }, [token]);

  useEffect(() => {
    if (!activeConversationId) return;
    if (!token) return;

    const existing = messagesByConversation[activeConversationId];
    if (existing && existing.length > 0) return;

    void loadConversationMessages(activeConversationId);
  }, [activeConversationId, token]);

  useEffect(() => {
    requestAnimationFrame(() => {
      const el = threadRef.current;
      if (!el) return;

      if (shouldStickToBottomRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }, [activeConversationId, pendingMessages, streamingConversationId]);

  useEffect(() => {
    if (!token) return;
    if (!activeConversationId) return;

    void loadConversationTokenSum(activeConversationId);
  }, [token, activeConversationId]);

  useEffect(() => {
    if (!activeConversationId) return;
    if (!threadRef.current) return;
    if (!topSentinelRef.current) return;
    if (!messagesByConversation[activeConversationId]?.length) return;

    const root = threadRef.current;
    const sentinel = topSentinelRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;

        void loadOlderMessages(activeConversationId);
      },
      {
        root,
        rootMargin: "120px 0px 0px 0px",
        threshold: 0,
      },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [
    activeConversationId,
    token,
    loadingOlderFor,
    hasMoreByConversation,
    messagesByConversation,
    streamingConversationId,
  ]);

  useEffect(() => {
    if (!activeConversationId) return;
    if (pendingMessagesRef.current.length === 0 && pendingSelectedModelRef.current == null) return;

    setPendingMessages([]);
    setPendingSelectedModel(null);
  }, [activeConversationId]);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;

    const update = () => {
      setFooterHeight(el.getBoundingClientRect().height);
    };

    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  function handleThreadScroll() {
    const el = threadRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 120;
  }

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

  async function handleTogglePin(conversationId: string, nextPinned: boolean) {
    if (!token) return;

    const prevConversations = conversations;
    const nowIso = new Date().toISOString();

    setConversations((prev) =>
      sortConversations(
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                isPinned: nextPinned,
                pinnedAt: nextPinned ? nowIso : null,
              }
            : c,
        ),
      ),
    );

    try {
      await patchConversationPin(token, conversationId, nextPinned);
    } catch (err) {
      console.error("Failed to toggle conversation pin:", err);
      setConversations(prevConversations);
    }
  }

  async function refreshFavorites(currentConversations?: Conversation[]) {
    if (!token) return [];

    setLoadingFavorites(true);

    try {
      const rows = await listFavoriteMessages(token, 50, 0);
      const convs = currentConversations ?? conversations;
      const titleById = new Map(convs.map((c) => [c.id, c.title]));

      const mapped: FavoriteItem[] = (rows ?? []).map((row: FavoriteMessageDTO) => {
        const conversationId = row.conv_id || row.conversationId || "";
        return {
          id: row.id,
          conversationId,
          content:
            (row.favorite_label && row.favorite_label.trim()) ||
            getMessagePreview(row.content || ""),
          conversationTitle: titleById.get(conversationId) ?? "Conversation",
        };
      });

      setFavorites(mapped);
      return mapped;
    } catch {
      setFavorites([]);
      return [];
    } finally {
      setLoadingFavorites(false);
    }
  }

  async function loadConversationMessages(conversationId: string) {
    if (!token) return;

    const existing = messagesByConversation[conversationId];
    if (existing && existing.length > 0) return;

    setLoadingMessagesFor(conversationId);

    try {
      const rows = await listConversationMessages(token, conversationId, PAGE_SIZE);
      const mapped = sortMessagesAsc((rows ?? []).map(normalizeMessage));

      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: mapped,
      }));

      setHasMoreByConversation((prev) => ({
        ...prev,
        [conversationId]: (rows?.length ?? 0) === PAGE_SIZE,
      }));

      await loadConversationAnnotations(conversationId, mapped);

      requestAnimationFrame(() => {
        const el = threadRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
        shouldStickToBottomRef.current = true;
      });
    } catch {
      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: [],
      }));

      setHasMoreByConversation((prev) => ({
        ...prev,
        [conversationId]: false,
      }));

      setAnnotationsByConversation((prev) => ({
        ...prev,
        [conversationId]: {},
      }));
    } finally {
      setLoadingMessagesFor((curr) => (curr === conversationId ? null : curr));
    }
  }

  async function loadOlderMessages(conversationId: string) {
    if (!token) return;
    if (paginationLockRef.current) return;
    if (loadingOlderFor === conversationId) return;
    if (!hasMoreByConversation[conversationId]) return;
    if (streamingConversationId) return;

    const current = messagesByConversation[conversationId] ?? [];
    if (current.length === 0) return;

    const oldest = current[0];
    if (!oldest?.id) return;

    const scroller = threadRef.current;
    const prevScrollHeight = scroller?.scrollHeight ?? 0;
    const prevScrollTop = scroller?.scrollTop ?? 0;

    paginationLockRef.current = true;
    setLoadingOlderFor(conversationId);

    try {
      const rows = await listConversationMessages(token, conversationId, PAGE_SIZE, oldest.id);
      const mapped = sortMessagesAsc((rows ?? []).map(normalizeMessage));

      if (mapped.length === 0) {
        setHasMoreByConversation((prev) => ({
          ...prev,
          [conversationId]: false,
        }));
        return;
      }

      let nextMessages: Msg[] = [];

      setMessagesByConversation((prev) => {
        const existing = prev[conversationId] ?? [];
        const existingIds = new Set(existing.map((m) => m.id));
        const newRows = mapped.filter((m) => !existingIds.has(m.id));

        nextMessages = newRows.length > 0 ? [...newRows, ...existing] : existing;

        if (newRows.length === 0) return prev;

        return {
          ...prev,
          [conversationId]: nextMessages,
        };
      });

      setHasMoreByConversation((prev) => ({
        ...prev,
        [conversationId]: rows.length === PAGE_SIZE,
      }));

      if (nextMessages.length > 0) {
        await loadConversationAnnotations(conversationId, nextMessages);
      }

      requestAnimationFrame(() => {
        const el = threadRef.current;
        if (!el) return;

        const newScrollHeight = el.scrollHeight;
        const delta = newScrollHeight - prevScrollHeight;
        el.scrollTop = prevScrollTop + delta;
      });
    } catch {
      // keep current UI state unchanged
    } finally {
      setLoadingOlderFor((curr) => (curr === conversationId ? null : curr));
      paginationLockRef.current = false;
    }
  }

  async function loadConversationTokenSum(conversationId: string, force = false) {
    if (!token) return;

    if (!force && conversationId in tokenSumByConversation) return;

    setLoadingTokenSumFor(conversationId);

    try {
      const res = await getConversationTokenSum(token, conversationId);
      setTokenSumByConversation((prev) => ({
        ...prev,
        [conversationId]: res?.token_sum ?? 0,
      }));
    } catch {
      setTokenSumByConversation((prev) => ({
        ...prev,
        [conversationId]: null,
      }));
    } finally {
      setLoadingTokenSumFor((curr) => (curr === conversationId ? null : curr));
    }
  }

  async function loadConversationAnnotations(conversationId: string, messages: Msg[]) {
    if (!token) return;
    if (!conversationId) return;

    const messageIds = messages.map((m) => m.id).filter(Boolean);
    if (messageIds.length === 0) {
      setAnnotationsByConversation((prev) => ({
        ...prev,
        [conversationId]: {},
      }));
      return;
    }

    try {
      const rows = await listConversationAnnotations(token, conversationId, messageIds);
      const grouped = groupAnnotationsByMessageId(rows ?? []);

      setAnnotationsByConversation((prev) => ({
        ...prev,
        [conversationId]: grouped,
      }));
    } catch {
      setAnnotationsByConversation((prev) => ({
        ...prev,
        [conversationId]: {},
      }));
    }
  }

  function onSelectConversation(id: string) {
    if (streamingConversationId) return;

    router.push(`/c/${id}`);
    setSidebarOpen(false);
  }

  async function onSelectFavorite(fav: FavoriteItem) {
    if (streamingConversationId) return;
    if (!token) return;

    try {
      const rows = await listFavoriteJumpMessages(token, fav.conversationId, fav.id, 50);
      const mapped = sortMessagesAsc((rows ?? []).map(normalizeMessage));

      setMessagesByConversation((prev) => ({
        ...prev,
        [fav.conversationId]: mapped,
      }));

      setHasMoreByConversation((prev) => ({
        ...prev,
        [fav.conversationId]: true,
      }));

      await loadConversationAnnotations(fav.conversationId, mapped);

      router.push(`/c/${fav.conversationId}`);
      setSidebarOpen(false);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = document.getElementById(`msg-${fav.id}`);
          const scroller = threadRef.current;

          if (!el || !scroller) return;

          const scrollerRect = scroller.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const top = elRect.top - scrollerRect.top + scroller.scrollTop - 24;

          scroller.scrollTo({ top: Math.max(0, top), behavior: "smooth" });

          el.classList.add("favorite-jump-flash");
          window.setTimeout(() => {
            el.classList.remove("favorite-jump-flash");
          }, 1600);
        });
      });
    } catch (err) {
      console.error("Failed to open favorite:", err);
    }
  }

  async function toggleFavorite(messageId: string, nextValue: boolean) {
    if (!token || !activeConversationId) return;
    if (togglingFavoriteId) return;

    setTogglingFavoriteId(messageId);

    const prevMessages = messagesByConversation[activeConversationId] ?? [];
    const targetMessage = prevMessages.find((m) => m.id === messageId);

    setMessagesByConversation((prev) => {
      const current = prev[activeConversationId] ?? [];
      return {
        ...prev,
        [activeConversationId]: current.map((m) =>
          m.id === messageId ? { ...m, isFavorite: nextValue } : m,
        ),
      };
    });

    try {
      await patchMessageFavorite(token, messageId, nextValue);
      await refreshFavorites();

      if (nextValue && targetMessage) {
        setFavoriteLabelTarget({
          messageId,
          conversationId: activeConversationId,
          previewText: getMessagePreview(targetMessage.content || "", 72),
          initialLabel: targetMessage.favoriteLabel ?? "",
        });
      }
    } catch (err) {
      console.error("Failed to toggle favorite:", err);

      setMessagesByConversation((prev) => ({
        ...prev,
        [activeConversationId]: prevMessages,
      }));
    } finally {
      setTogglingFavoriteId(null);
    }
  }

  async function saveFavoriteLabel(value: string) {
    if (!token || !favoriteLabelTarget) return;

    setSavingFavoriteLabel(true);

    try {
      await patchMessageFavoriteLabel(token, favoriteLabelTarget.messageId, value);

      setMessagesByConversation((prev) => {
        const convId = favoriteLabelTarget.conversationId;
        const current = prev[convId] ?? [];

        return {
          ...prev,
          [convId]: current.map((m) =>
            m.id === favoriteLabelTarget.messageId ? { ...m, favoriteLabel: value || null } : m,
          ),
        };
      });

      await refreshFavorites();
      setFavoriteLabelTarget(null);
    } catch (err) {
      console.error("Failed to save favorite label:", err);
    } finally {
      setSavingFavoriteLabel(false);
    }
  }

  function createConversationLocal() {
    if (streamingConversationId) return;

    setPendingMessages([]);
    setPendingSelectedModel(null);

    router.push("/");
    setSidebarOpen(false);
  }

  async function onSend(text: string): Promise<boolean> {
    const trimmed = text.trim();
    if (!trimmed || !token) return false;
    if (streamingConversationId) return false;

    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();
    let currentUserMessageId = userMessageId;
    let currentAssistantMessageId = assistantMessageId;
    const nowIso = new Date().toISOString();

    const isNewConversation = !activeConversationId;
    const existingConversationIds = new Set(conversations.map((c) => c.id));

    const streamLockId = activeConversationId ?? "__pending__";
    setStreamingConversationId(streamLockId);

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

      setPendingSelectedModel(null);
    } else {
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

      shouldStickToBottomRef.current = true;
    }

    let resolvedConversationId: string | undefined;

    const replaceMessageId = (convId: string, tempId: string, realId: string) => {
      setMessagesByConversation((prev) => {
        const current = prev[convId] ?? [];
        if (current.length === 0) return prev;

        return {
          ...prev,
          [convId]: current.map((m) => (m.id === tempId ? { ...m, id: realId } : m)),
        };
      });
    };

    const replacePendingMessageId = (tempId: string, realId: string) => {
      setPendingMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: realId } : m)));
    };

    try {
      await startChatStream({
        token,
        body: isNewConversation
          ? { message: trimmed }
          : { message: trimmed, conversation_id: activeConversationId! },

        onEvent: (event) => {
          if (event.type === "meta") {
            if (event.conversationId) {
              resolvedConversationId = event.conversationId;

              if (isNewConversation) {
                const realId = event.conversationId;

                setMessagesByConversation((prev) => {
                  if (prev[realId]?.length) return prev;

                  return {
                    ...prev,
                    [realId]: pendingMessagesRef.current,
                  };
                });

                if (pendingSelectedModelRef.current) {
                  setSelectedModelByConversation((prev) => ({
                    ...prev,
                    [realId]: pendingSelectedModelRef.current!,
                  }));
                }
              }
            }

            const convId = resolvedConversationId || activeConversationId || undefined;

            if (event.userMessageId) {
              if (isNewConversation) {
                replacePendingMessageId(currentUserMessageId, event.userMessageId);
              }
              if (convId) {
                replaceMessageId(convId, currentUserMessageId, event.userMessageId);
              }
              currentUserMessageId = event.userMessageId;
            }

            if (event.assistantMessageId) {
              if (isNewConversation) {
                replacePendingMessageId(currentAssistantMessageId, event.assistantMessageId);
              }
              if (convId) {
                replaceMessageId(convId, currentAssistantMessageId, event.assistantMessageId);
              }
              currentAssistantMessageId = event.assistantMessageId;
            }

            if (event.title && event.conversationId) {
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === event.conversationId ? { ...c, title: event.title! } : c,
                ),
              );
            }

            return;
          }

          if (event.type === "model") {
            if (isNewConversation) {
              setPendingSelectedModel(event.value);

              if (resolvedConversationId) {
                setSelectedModelByConversation((prev) => ({
                  ...prev,
                  [resolvedConversationId!]: event.value,
                }));
              }
            } else {
              setSelectedModelByConversation((prev) => ({
                ...prev,
                [activeConversationId!]: event.value,
              }));
            }

            return;
          }

          if (event.type === "delta") {
            if (isNewConversation) {
              setPendingMessages((prev) =>
                prev.map((m) =>
                  m.id === currentAssistantMessageId
                    ? { ...m, content: m.content + event.text, status: "streaming" }
                    : m,
                ),
              );
            } else {
              setMessagesByConversation((prev) => {
                const current = prev[activeConversationId!] ?? [];

                return {
                  ...prev,
                  [activeConversationId!]: current.map((m) =>
                    m.id === currentAssistantMessageId
                      ? { ...m, content: m.content + event.text, status: "streaming" }
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
                  m.id === currentAssistantMessageId ? { ...m, status: "done" } : m,
                ),
              );
            } else {
              setMessagesByConversation((prev) => {
                const current = prev[activeConversationId!] ?? [];

                return {
                  ...prev,
                  [activeConversationId!]: current.map((m) =>
                    m.id === currentAssistantMessageId ? { ...m, status: "done" } : m,
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
                  m.id === currentAssistantMessageId ? { ...m, status: "error" } : m,
                ),
              );
            } else {
              setMessagesByConversation((prev) => {
                const current = prev[activeConversationId!] ?? [];

                return {
                  ...prev,
                  [activeConversationId!]: current.map((m) =>
                    m.id === currentAssistantMessageId ? { ...m, status: "error" } : m,
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

          setMessagesByConversation((prev) => {
            const alreadyExisting = prev[finalConversationId] ?? [];
            const pending = pendingMessagesRef.current ?? [];

            return {
              ...prev,
              [finalConversationId]: alreadyExisting.length > 0 ? alreadyExisting : pending,
            };
          });

          if (pendingSelectedModelRef.current) {
            setSelectedModelByConversation((prev) => ({
              ...prev,
              [finalConversationId]: pendingSelectedModelRef.current!,
            }));
          }

          router.replace(`/c/${finalConversationId}`);
          void loadConversationTokenSum(finalConversationId, true);
        }
      }

      if (!isNewConversation && activeConversationId) {
        void loadConversationTokenSum(activeConversationId, true);
      }

      return true;
    } catch {
      return false;
    } finally {
      setStreamingConversationId(null);
    }
  }

  const activeMessages = activeConversationId
    ? (messagesByConversation[activeConversationId] ?? [])
    : pendingMessages;

  const activeAnnotationsByMessageId = activeConversationId
    ? (annotationsByConversation[activeConversationId] ?? {})
    : {};

  const activeTitle = activeConversationId
    ? (conversations.find((c) => c.id === activeConversationId)?.title ?? "Conversation")
    : "RHEA Index";

  const activeSelectedModel = activeConversationId
    ? (selectedModelByConversation[activeConversationId] ?? null)
    : pendingSelectedModel;

  return (
    <div className="h-[100dvh] w-screen overflow-hidden">
      <div className="flex h-full w-full">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          conversations={conversations}
          favorites={favorites}
          activeConversationId={activeConversationId}
          onSelectConversation={onSelectConversation}
          onSelectFavorite={onSelectFavorite}
          onCreateConversation={createConversationLocal}
          onTogglePin={handleTogglePin}
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
                onScroll={handleThreadScroll}
                className={[
                  "min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-6",
                  mobileSelectionToolbarVisible ? "pb-40 md:pb-6" : "pb-6 md:pb-6",
                ].join(" ")}
              >
                <div className="mx-auto w-full max-w-3xl">
                  {activeConversationId ? (
                    <div ref={topSentinelRef} className="h-1 w-full" aria-hidden="true" />
                  ) : null}

                  {activeConversationId && loadingOlderFor === activeConversationId ? (
                    <div className="mb-3 flex items-center justify-center py-2">
                      <div className="text-xs text-[color:var(--text-2)]">
                        Loading older messages…
                      </div>
                    </div>
                  ) : null}

                  {activeMessages.length === 0 ? (
                    loadingMessagesFor === activeConversationId ? (
                      <MessagesLoadingState />
                    ) : (
                      <ConversationEmptyHint />
                    )
                  ) : (
                    <>
                      <MessageList
                        messages={activeMessages}
                        annotationsByMessageId={activeAnnotationsByMessageId}
                        onToggleFavorite={toggleFavorite}
                        togglingFavoriteId={togglingFavoriteId}
                        onCreateHighlight={async (messageId, range) => {
                          if (!token || !activeConversationId) return;

                          setAnnotationsByConversation((prev) => {
                            const currentConv = prev[activeConversationId] ?? {};
                            const currentMsg = currentConv[messageId] ?? [];

                            return {
                              ...prev,
                              [activeConversationId]: {
                                ...currentConv,
                                [messageId]: applyOptimisticHighlightAdd(
                                  currentMsg,
                                  messageId,
                                  activeConversationId,
                                  range,
                                ),
                              },
                            };
                          });

                          try {
                            await createHighlightAnnotation(token, {
                              message_id: messageId,
                              conv_id: activeConversationId,
                              range_start: range.start,
                              range_end: range.end,
                              bg_color: "#FACC15",
                            });
                          } catch (err) {
                            console.error("Failed to persist highlight add:", err);
                          }
                        }}
                        onRemoveHighlightRange={async (messageId, range) => {
                          if (!token || !activeConversationId) return;

                          setAnnotationsByConversation((prev) => {
                            const currentConv = prev[activeConversationId] ?? {};
                            const currentMsg = currentConv[messageId] ?? [];

                            return {
                              ...prev,
                              [activeConversationId]: {
                                ...currentConv,
                                [messageId]: applyOptimisticHighlightRemove(
                                  currentMsg,
                                  messageId,
                                  activeConversationId,
                                  range,
                                ),
                              },
                            };
                          });

                          try {
                            await removeHighlightRange(token, {
                              message_id: messageId,
                              conv_id: activeConversationId,
                              range_start: range.start,
                              range_end: range.end,
                            });
                          } catch (err) {
                            console.error("Failed to persist highlight removal:", err);
                          }
                        }}
                        onSelectionToolbarVisibleChange={setMobileSelectionToolbarVisible}
                        mobileFooterOffset={footerHeight}
                      />
                      <div className="h-6" />
                    </>
                  )}
                </div>
              </div>

              <div
                ref={footerRef}
                className="border-t border-[color:var(--border-0)] bg-[color:var(--bg-0)] px-4 py-3 md:px-6"
              >
                <div className="mx-auto w-full max-w-3xl">
                  {(activeSelectedModel || activeConversationId) && (
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {activeSelectedModel ? <ModelBadge model={activeSelectedModel} /> : null}

                      {activeConversationId ? (
                        <TokenBadge
                          tokenSum={tokenSumByConversation[activeConversationId] ?? null}
                          loading={loadingTokenSumFor === activeConversationId}
                        />
                      ) : null}
                    </div>
                  )}

                  <Composer
                    participants={participants}
                    onSend={onSend}
                    disabled={!!streamingConversationId}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <FavoriteLabelPopup
        open={!!favoriteLabelTarget}
        initialValue={favoriteLabelTarget?.initialLabel ?? ""}
        previewText={favoriteLabelTarget?.previewText ?? ""}
        saving={savingFavoriteLabel}
        onClose={() => setFavoriteLabelTarget(null)}
        onSave={saveFavoriteLabel}
      />
    </div>
  );
}

function WelcomeComposer(props: {
  userName: string;
  onSend: (text: string) => Promise<boolean>;
  disabled?: boolean;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto max-w-3xl text-center">
        <div className="text-[20px] font-medium text-[color:var(--text-0)]">
          What would you like to explore today?
        </div>

        <div className="mt-6">
          <Composer participants={[]} onSend={props.onSend} disabled={props.disabled} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Prompt
            text="Explain RAG like I'm implementing it in Go."
            onClick={() => {
              void props.onSend("Explain RAG like I'm implementing it in Go.");
            }}
          />

          <Prompt
            text="Ask me 3 questions to test my understanding."
            onClick={() => {
              void props.onSend("Ask me 3 questions to test my understanding.");
            }}
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
      <div className={`h-3 rounded bg-[color:var(--bg-3)] ${wide ? "w-[90%]" : "w-[70%]"}`} />
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
      <div className="mt-2 text-lg font-medium text-[color:var(--text-0)]">Start the thread</div>
      <div className="mt-2 text-sm text-[color:var(--text-1)]">
        Ask something, paste notes, or continue building your thinking here. Older messages will be
        paginated upward once we add infinite scroll.
      </div>
    </div>
  );
}
