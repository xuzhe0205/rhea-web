import { apiFetch } from "@/lib/api";

export type CommentDTO = {
  id: string;
  thread_id: string;
  message_id: string;
  conv_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type CommentThreadDTO = {
  id: string;
  message_id: string;
  conv_id: string;
  user_id: string;
  range_start: number;
  range_end: number;
  selected_text_snapshot: string;
  created_at: string;
  updated_at: string;
  comments?: CommentDTO[];
};

export type AddCommentInput = {
  message_id: string;
  conv_id: string;
  range_start: number;
  range_end: number;
  selected_text_snapshot: string;
  content: string;
};

export async function listCommentThreadsByMessageIds(token: string, messageIds: string[]) {
  const qs = new URLSearchParams();
  if (messageIds.length > 0) {
    qs.set("message_ids", messageIds.join(","));
  }

  return apiFetch<CommentThreadDTO[]>(`/v1/comment-threads?${qs.toString()}`, {
    method: "GET",
    token,
  });
}

export async function getCommentThreadByRange(
  token: string,
  input: {
    message_id: string;
    range_start: number;
    range_end: number;
  },
) {
  const qs = new URLSearchParams({
    message_id: input.message_id,
    range_start: String(input.range_start),
    range_end: String(input.range_end),
  });

  return apiFetch<CommentThreadDTO>(`/v1/comments/thread?${qs.toString()}`, {
    method: "GET",
    token,
  });
}

export async function addComment(token: string, input: AddCommentInput) {
  return apiFetch<{ thread: CommentThreadDTO; comment: CommentDTO }>(`/v1/comments`, {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });
}

export async function getComment(token: string, commentId: string) {
  return apiFetch<CommentDTO>(`/v1/comments/${commentId}`, {
    method: "GET",
    token,
  });
}

export async function deleteComment(token: string, commentId: string) {
  return apiFetch<void>(`/v1/comments/${commentId}`, {
    method: "DELETE",
    token,
  });
}

export function groupCommentThreadsByMessageId(rows: CommentThreadDTO[]) {
  const grouped: Record<string, CommentThreadDTO[]> = {};

  for (const row of rows ?? []) {
    if (!grouped[row.message_id]) {
      grouped[row.message_id] = [];
    }
    grouped[row.message_id].push(row);
  }

  return grouped;
}
