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
) {
  return apiFetch<MessageDTO[]>(
    `/v1/conversations/${conversationId}/messages?limit=${limit}`,
    {
      method: "GET",
      token,
    },
  );
}
