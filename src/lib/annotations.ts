import { apiFetch } from "@/lib/api";

export type AnnotationType = "highlight" | "comment" | "bold" | "underline";

export type AnnotationDTO = {
  id: string;
  message_id: string;
  conv_id: string;
  user_id?: string;
  type: AnnotationType;
  range_start: number;
  range_end: number;
  user_note: string;
  bg_color?: string | null;
  text_color?: string | null;
  is_bold?: boolean | null;
  is_underline?: boolean | null;
  extra_attrs?: Record<string, unknown>;
};

export type CreateHighlightInput = {
  message_id: string;
  conv_id: string;
  range_start: number;
  range_end: number;
  bg_color?: string | null;
};

export async function listMessageAnnotations(token: string, messageId: string) {
  return apiFetch<AnnotationDTO[]>(`/v1/messages/${messageId}/annotations`, {
    method: "GET",
    token,
  });
}

export async function listConversationAnnotations(
  token: string,
  conversationId: string,
  messageIds: string[],
) {
  const qs = new URLSearchParams();

  if (messageIds.length > 0) {
    qs.set("message_ids", messageIds.join(","));
  }

  return apiFetch<AnnotationDTO[]>(
    `/v1/conversations/${conversationId}/annotations?${qs.toString()}`,
    {
      method: "GET",
      token,
    },
  );
}

export async function createHighlightAnnotation(
  token: string,
  input: CreateHighlightInput,
) {
  return apiFetch<{ id: string }>(`/v1/annotations`, {
    method: "POST",
    token,
    body: JSON.stringify({
      message_id: input.message_id,
      conv_id: input.conv_id,
      type: "highlight",
      range_start: input.range_start,
      range_end: input.range_end,
      user_note: "",
      bg_color: input.bg_color ?? "#FACC15",
      extra_attrs: {},
    }),
  });
}

// Helper func

export function groupAnnotationsByMessageId(rows: AnnotationDTO[]) {
  const grouped: Record<string, AnnotationDTO[]> = {};

  for (const row of rows ?? []) {
    if (!grouped[row.message_id]) {
      grouped[row.message_id] = [];
    }
    grouped[row.message_id].push(row);
  }

  return grouped;
}