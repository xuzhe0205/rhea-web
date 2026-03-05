"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearToken, getMe, getToken, login, register, type Me } from "@/lib/auth";

type AuthState =
  | { status: "loading"; token: string | null; me: Me | null }
  | { status: "authed"; token: string; me: Me }
  | { status: "anon"; token: null; me: null };

type AuthCtx = {
  state: AuthState;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    token: null,
    me: null,
  });

  async function refresh() {
    const token = getToken();
    if (!token) {
      setState({ status: "anon", token: null, me: null });
      return;
    }
    setState({ status: "loading", token, me: null });
    try {
      const me = await getMe(token);
      setState({ status: "authed", token, me });
    } catch {
      // token invalid/expired
      clearToken();
      setState({ status: "anon", token: null, me: null });
    }
  }

  async function signIn(email: string, password: string) {
  // keep whatever current token/me were; but show loading
  setState((s) => ({
    status: "loading",
    token: s.status === "authed" ? s.token : null,
    me: s.status === "authed" ? s.me : null,
  }));

  try {
    const token = await login(email, password);
    const me = await getMe(token);
    setState({ status: "authed", token, me });
  } catch (err) {
    // ✅ crucial: revert to anonymous on failure
    clearToken();
    setState({ status: "anon", token: null, me: null });
    throw err;
  }
}

async function signUp(email: string, password: string) {
  setState((s) => ({
    status: "loading",
    token: s.status === "authed" ? s.token : null,
    me: s.status === "authed" ? s.me : null,
  }));

  try {
    await register(email, password);
    const token = await login(email, password);
    const me = await getMe(token);
    setState({ status: "authed", token, me });
  } catch (err) {
    clearToken();
    setState({ status: "anon", token: null, me: null });
    throw err;
  }
}

  function signOut() {
    clearToken();
    setState({ status: "anon", token: null, me: null });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({ state, refresh, signIn, signUp, signOut }),
    [state]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}