"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ChatShell } from "@/components/shell/ChatShell";

export default function HomePage() {
  const router = useRouter();
  const { state } = useAuth();

  useEffect(() => {
    if (state.status === "anon") router.replace("/login");
  }, [state.status, router]);

  if (state.status === "loading") {
    return (
      <div className="min-h-dvh bg-[color:var(--bg-0)] text-[color:var(--text-0)] flex items-center justify-center">
        <div className="text-sm text-[color:var(--text-1)]">Loading…</div>
      </div>
    );
  }

  if (state.status === "anon") return null; // redirecting

  return <ChatShell />;
}