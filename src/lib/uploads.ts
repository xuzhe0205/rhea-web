import { API_BASE } from "@/lib/api";

export async function uploadImage(
  token: string,
  file: File,
): Promise<{ key: string; url: string }> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/v1/uploads/image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    let msg = `Upload failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) msg = body.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  return res.json();
}

export async function deleteUploadedImage(
  token: string,
  key: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/v1/uploads/image?key=${encodeURIComponent(key)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(`Delete failed (${res.status})`);
  }
}
