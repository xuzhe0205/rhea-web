import { apiFetch } from "./api";

const TOKEN_KEY = "rhea_token";

export type Me = {
  id: string;
  email: string;
  user_name?: string;
  created_at?: string;
  metadata?: unknown;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function login(email: string, password: string) {
  const out = await apiFetch<{ token: string }>("/v1/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(out.token);
  return out.token;
}

export async function register(email: string, password: string) {
  // Your backend returns {id, email} on success
  return await apiFetch<{ id: string; email: string }>("/v1/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(token: string) {
  return await apiFetch<Me>("/v1/me", {
    method: "GET",
    token,
  });
}
