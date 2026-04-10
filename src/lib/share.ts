import { apiFetch, API_BASE } from "@/lib/api";

export type ShareLinkResponse = {
  token: string;
  url: string;
};

export type SharedMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  metadata?: { image_urls?: string[] };
};

export type SharedContentResponse = {
  messages: SharedMessage[];
  shared_at: string;
};

export async function createShareLink(
  token: string,
  messageIds: string[],
): Promise<ShareLinkResponse> {
  return apiFetch<ShareLinkResponse>("/v1/share", {
    method: "POST",
    token,
    body: JSON.stringify({ message_ids: messageIds }),
  });
}

// Called from server components (no auth token needed — public endpoint)
export async function fetchSharedContent(
  shareToken: string,
): Promise<SharedContentResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/share/${shareToken}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<SharedContentResponse>;
  } catch {
    return null;
  }
}
