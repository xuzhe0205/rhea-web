import { apiFetch } from "@/lib/api";

export type ConversationDTO = {
  id: string;
  title?: string;
  updated_at?: string;
  created_at?: string;
  is_pinned?: boolean;
  pinned_at?: string | null;
  cumulative_tokens: number;
};

export async function listConversations(token: string) {
  return apiFetch<ConversationDTO[]>("/v1/conversations", {
    method: "GET",
    token,
  });
}

export async function patchConversationPin(
  token: string,
  conversationId: string,
  isPinned: boolean,
) {
  return apiFetch<{
    conversation_id: string;
    is_pinned: boolean;
    updated: boolean;
  }>(`/v1/conversations/${conversationId}/pin`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ is_pinned: isPinned }),
  });
}

export async function getConversation(token: string, conversationId: string) {
  return apiFetch<ConversationDTO>(`/v1/conversations/${conversationId}`, {
    method: "GET",
    token,
  });
}
