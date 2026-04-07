"use client";

import { useEffect, useRef, useState } from "react";
import { createProject, type ProjectDTO } from "@/lib/projects";

type Props = {
  token: string;
  onClose: () => void;
  onCreated: (project: ProjectDTO) => void;
};

export function CreateProjectModal({ token, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) {
      nameRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setSaving(true);
    setError(null);

    try {
      const project = await createProject(token, {
        name: trimmedName,
        description: description.trim() || undefined,
      });
      onCreated(project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-[460px] rounded-[var(--radius-lg)] border border-[color:var(--border-0)] bg-[color:var(--bg-1)] shadow-2xl">

        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-[color:var(--border-0)]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight text-[color:var(--text-0)]">
              Create project
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[color:var(--text-2)] hover:bg-[color:var(--bg-3)] hover:text-[color:var(--text-0)] transition"
              aria-label="Close"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-[color:var(--text-2)]">
            A project is a persistent workspace. Conversations inside a project share
            context and memory — letting you build on prior work over time.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pt-5 pb-6 space-y-4">
          <div>
            <label
              htmlFor="project-name"
              className="mb-1.5 block text-xs font-medium tracking-wide text-[color:var(--text-1)]"
            >
              Project name <span className="text-[color:var(--accent)]">*</span>
            </label>
            <input
              ref={nameRef}
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. RHEA Redesign, Thesis Research…"
              maxLength={50}
              className={[
                "w-full rounded-[var(--radius-md)] border bg-[color:var(--bg-2)] px-3 py-2.5",
                "text-base md:text-sm text-[color:var(--text-0)] placeholder:text-[color:var(--text-2)]",
                "focus:outline-none focus:ring-0 transition",
                name.length >= 50
                  ? "border-red-500/70"
                  : "border-[color:var(--border-0)] focus:border-[color:var(--accent)]",
              ].join(" ")}
              disabled={saving}
              autoComplete="off"
            />
            <div className="mt-1.5 flex items-center justify-between">
              {name.length >= 50 ? (
                <p className="text-xs text-red-400">Name cannot exceed 50 characters.</p>
              ) : (
                <span />
              )}
              {name.length >= 40 && (
                <span className={[
                  "text-xs tabular-nums",
                  name.length >= 50 ? "text-red-400" : "text-[color:var(--text-2)]",
                ].join(" ")}>
                  {name.length} / 50
                </span>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="project-desc"
              className="mb-1.5 block text-xs font-medium tracking-wide text-[color:var(--text-1)]"
            >
              Description{" "}
              <span className="font-normal text-[color:var(--text-2)]">(optional)</span>
            </label>
            <textarea
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              maxLength={500}
              rows={3}
              className={[
                "w-full resize-none rounded-[var(--radius-md)] border bg-[color:var(--bg-2)] px-3 py-2.5",
                "text-base md:text-sm text-[color:var(--text-0)] placeholder:text-[color:var(--text-2)]",
                "focus:outline-none focus:border-[color:var(--accent)] transition",
                "border-[color:var(--border-0)]",
              ].join(" ")}
              disabled={saving}
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-9 rounded-[var(--radius-md)] px-4 text-sm text-[color:var(--text-1)] hover:text-[color:var(--text-0)] hover:bg-[color:var(--bg-3)] transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className={[
                "h-9 rounded-[var(--radius-md)] px-4 text-sm font-medium transition",
                "bg-[color:var(--accent)] text-white",
                "hover:opacity-90 active:opacity-80",
                "disabled:opacity-40 disabled:cursor-not-allowed",
              ].join(" ")}
            >
              {saving ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
