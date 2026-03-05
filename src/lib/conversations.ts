import { apiFetch } from "@/lib/api";

export type ConversationDTO = {
  id: string;
  title?: string;
  updated_at?: string; // depending on your Go json tags
  created_at?: string;
};

export async function listConversations(token: string) {
  return apiFetch<ConversationDTO[]>("/v1/conversations", {
    method: "GET",
    token,
  });
}
