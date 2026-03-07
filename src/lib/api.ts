export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "http://localhost:8080";

export async function apiFetch<T>(
  path: string,
  opts: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;

  const hasBody = opts.body != null;
  const isFormData =
    typeof FormData !== "undefined" && opts.body instanceof FormData;

  const headers: HeadersInit = {
    ...(!isFormData && hasBody ? { "Content-Type": "application/json" } : {}),
    ...(opts.headers ?? {}),
    ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
  };

  const res = await fetch(url, {
    ...opts,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const msg = text || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return undefined as unknown as T;
  }
  return (await res.json()) as T;
}
