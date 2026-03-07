import { API_BASE } from "@/lib/api";

export type ChatStreamRequest = {
  message: string;
  conversation_id?: string;
};

export type ChatStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; error: string }
  | { type: "meta"; conversationId?: string };

type StartChatStreamArgs = {
  token: string;
  body: ChatStreamRequest;
  signal?: AbortSignal;
  onEvent: (event: ChatStreamEvent) => void;
};

export async function startChatStream({
  token,
  body,
  signal,
  onEvent,
}: StartChatStreamArgs): Promise<void> {
  const res = await fetch(`${API_BASE}/v1/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const text = await res.text();
      if (text) message = text;
    } catch {}
    throw new Error(message);
  }

  if (!res.body) {
    throw new Error("Streaming response body is missing.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let buffer = "";
  let currentEvent = "message";
  let currentDataLines: string[] = [];

  const flushEvent = () => {
    const data = currentDataLines.join("\n");

    if (currentEvent === "delta") {
      onEvent({ type: "delta", text: data });
    } else if (currentEvent === "done") {
      onEvent({ type: "done" });
    } else if (currentEvent === "error") {
      onEvent({ type: "error", error: data || "Unknown stream error" });
    } else if (currentEvent === "meta") {
      // optional future-proof event if backend emits metadata JSON
      try {
        const parsed = JSON.parse(data);
        onEvent({
          type: "meta",
          conversationId:
            parsed.conversation_id || parsed.conversationId || undefined,
        });
      } catch {
        onEvent({ type: "meta" });
      }
    }

    currentEvent = "message";
    currentDataLines = [];
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const sepIndex = buffer.indexOf("\n\n");
      if (sepIndex === -1) break;

      const rawEventBlock = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);

      const lines = rawEventBlock.split(/\r?\n/);

      currentEvent = "message";
      currentDataLines = [];

      for (const line of lines) {
        if (!line) continue;
        if (line.startsWith(":")) continue;

        if (line.startsWith("event:")) {
          currentEvent = line.slice("event:".length).trim();
          continue;
        }

        if (line.startsWith("data:")) {
          currentDataLines.push(line.slice("data:".length).trimStart());
        }
      }

      flushEvent();
    }
  }

  if (buffer.trim()) {
    const lines = buffer.split(/\r?\n/);
    currentEvent = "message";
    currentDataLines = [];

    for (const line of lines) {
      if (!line) continue;
      if (line.startsWith(":")) continue;

      if (line.startsWith("event:")) {
        currentEvent = line.slice("event:".length).trim();
      } else if (line.startsWith("data:")) {
        currentDataLines.push(line.slice("data:".length).trimStart());
      }
    }

    flushEvent();
  }
}
