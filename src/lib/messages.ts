import { apiFetch } from "@/lib/api";

export type MessageDTO = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};

export async function listConversationMessages(
  token: string,
  conversationId: string,
  limit = 50,
  beforeId?: string,
) {
  const qs = new URLSearchParams();
  qs.set("limit", String(limit));

  if (beforeId) {
    qs.set("before_id", beforeId);
  }

  return apiFetch<MessageDTO[]>(`/v1/conversations/${conversationId}/messages?${qs.toString()}`, {
    method: "GET",
    token,
  });
}
