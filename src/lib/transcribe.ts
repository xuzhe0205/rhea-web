import { API_BASE, RateLimitError } from "./api";

export async function transcribeAudio(
  blob: Blob,
  token: string,
  language?: string,
): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, "recording.webm");

  const url = new URL(`${API_BASE}/v1/transcribe`);
  if (language) url.searchParams.set("language", language);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429) throw new RateLimitError(text || "Too many transcription requests — please wait a moment.");
    throw new Error(text || `Transcription failed: ${res.status}`);
  }

  const data = await res.json() as { transcript: string };
  return data.transcript ?? "";
}
