import { apiFetch } from "@/lib/api";

export type ConversationTokenSumDTO = {
  conversation_id: string;
  token_sum: number;
};

export async function getConversationTokenSum(
  token: string,
  conversationId: string,
) {
  return apiFetch<ConversationTokenSumDTO>(
    `/v1/conversations/${conversationId}/token-sum`,
    {
      method: "GET",
      token,
    },
  );
}
