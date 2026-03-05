"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/context/AuthContext";

export default function SignupPage() {
  const router = useRouter();
  const { state, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await signUp(email, password);
      router.push("/");
    } catch (e2: any) {
      setErr(e2?.message || "Sign up failed");
    }
  }

  return (
    <AuthShell
      title="Create account"
      subtitle="RHEA Index"
      footer={
        <>
          Already have an account?{" "}
          <Link className="text-[color:var(--text-0)] hover:opacity-90" href="/login">
            Sign in
          </Link>
          .
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email">
          <input
            className="rhea-focus w-full rounded-[var(--radius-md)] border border-[color:var(--border-0)] bg-[color:var(--bg-0)] px-3 py-2 text-sm text-[color:var(--text-0)] placeholder:text-[color:var(--text-2)]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            placeholder="you@domain.com"
            required
          />
        </Field>

        <Field label="Password">
          <input
            className="rhea-focus w-full rounded-[var(--radius-md)] border border-[color:var(--border-0)] bg-[color:var(--bg-0)] px-3 py-2 text-sm text-[color:var(--text-0)] placeholder:text-[color:var(--text-2)]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            type="password"
            placeholder="8+ characters"
            minLength={8}
            required
          />
        </Field>

        {err ? (
          <div className="rounded-[var(--radius-md)] border border-[color:var(--border-0)] bg-[color:var(--bg-0)] px-3 py-2 text-sm text-[color:var(--text-1)]">
            {err}
          </div>
        ) : null}

        <button
          type="submit"
          className="rhea-focus w-full rounded-[var(--radius-md)] border border-[color:var(--border-0)] bg-[rgba(94,124,226,0.10)] px-3 py-2 text-sm font-medium text-[color:var(--text-0)] hover:bg-[rgba(94,124,226,0.16)] transition"
          disabled={state.status === "loading"}
        >
          {state.status === "loading" ? "Creating…" : "Create account"}
        </button>

        <div className="pt-1 text-xs text-[color:var(--text-2)]">
          By creating an account, you agree to the service terms (later).
        </div>
      </form>
    </AuthShell>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-[color:var(--text-2)]">{props.label}</div>
      {props.children}
    </label>
  );
}