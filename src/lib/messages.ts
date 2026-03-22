import { apiFetch } from "@/lib/api";

export type MessageDTO = {
  id: string;
  conv_id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
  is_favorite?: boolean;
  favorited_at?: string | null;
  favorite_label?: string | null;
};

export type FavoriteMessageDTO = {
  id: string;
  conv_id?: string;
  conversationId?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
  createdAt?: string;
  favorited_at?: string | null;
  favoritedAt?: string | null;
  favorite_label?: string | null;
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

export async function patchMessageFavorite(token: string, messageId: string, isFavorite: boolean) {
  return apiFetch<{ message_id: string; is_favorite: boolean; updated: boolean }>(
    `/v1/messages/${messageId}/favorite`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify({ is_favorite: isFavorite }),
    },
  );
}

export async function listFavoriteMessages(token: string, limit = 50, offset = 0) {
  const qs = new URLSearchParams();
  qs.set("limit", String(limit));
  qs.set("offset", String(offset));

  return apiFetch<FavoriteMessageDTO[]>(`/v1/messages/favorites?${qs.toString()}`, {
    method: "GET",
    token,
  });
}

export async function listFavoriteJumpMessages(
  token: string,
  conversationId: string,
  messageId: string,
  olderBuffer = 50,
) {
  const qs = new URLSearchParams();
  qs.set("older_buffer", String(olderBuffer));

  return apiFetch<MessageDTO[]>(
    `/v1/conversations/${conversationId}/favorites/${messageId}/messages?${qs.toString()}`,
    {
      method: "GET",
      token,
    },
  );
}

export async function patchMessageFavoriteLabel(
  token: string,
  messageId: string,
  favoriteLabel: string,
) {
  return apiFetch<{ message_id: string; favorite_label: string | null; updated: boolean }>(
    `/v1/messages/${messageId}/favorite-label`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify({ favorite_label: favoriteLabel }),
    },
  );
}
