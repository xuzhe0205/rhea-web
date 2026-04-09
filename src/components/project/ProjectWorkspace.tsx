"use client";

import { useCallback, useEffect, useRef, useState } from "react"; // useRef kept for actionsRef
import { ThreadComposer } from "./ThreadComposer";
import {
  getProject,
  listProjectConversations,
  updateProject,
  deleteProject,
  createProjectConversation,
  type ProjectDTO,
  type ProjectConversationDTO,
} from "@/lib/projects";

// ─── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Props = {
  projectId: string;
  token: string;
  onNavigateToConversation: (id: string, initialMessage?: string, imageUrls?: string[]) => void;
  onProjectDeleted: () => void;
  onProjectUpdated: () => void;
};

// ─── Main Component ──────────────────────────────────────────────────────────

export function ProjectWorkspace({
  projectId,
  token,
  onNavigateToConversation,
  onProjectDeleted,
  onProjectUpdated,
}: Props) {
  const [project, setProject] = useState<ProjectDTO | null>(null);
  const [conversations, setConversations] = useState<ProjectConversationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [saveRenaming, setSaveRenaming] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);


  // ─── Load data ─────────────────────────────────────────────────────────────

  const loadProject = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await getProject(token, projectId);
      setProject(p);
    } catch {
      setError("Failed to load project.");
    } finally {
      setLoading(false);
    }
  }, [token, projectId]);

  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const rows = await listProjectConversations(token, projectId);
      setConversations(rows ?? []);
    } catch {
      setConversations([]);
    } finally {
      setLoadingConvs(false);
    }
  }, [token, projectId]);

  useEffect(() => {
    void loadProject();
    void loadConversations();
  }, [loadProject, loadConversations]);

  // ─── Actions menu close-on-outside-click ───────────────────────────────────

  useEffect(() => {
    if (!actionsOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setActionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [actionsOpen]);

  // ─── Rename ────────────────────────────────────────────────────────────────

  function beginRename() {
    setRenameValue(project?.name ?? "");
    setRenaming(true);
    setActionsOpen(false);
  }

  async function commitRename() {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === project?.name) {
      setRenaming(false);
      return;
    }
    setSaveRenaming(true);
    try {
      const updated = await updateProject(token, projectId, { name: trimmed });
      setProject(updated);
      onProjectUpdated();
    } catch {
      // silently revert
    } finally {
      setSaveRenaming(false);
      setRenaming(false);
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteProject(token, projectId);
      onProjectDeleted();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete project.");
      setDeleting(false);
    }
  }

  // ─── Start new thread ──────────────────────────────────────────────────────

  async function handleStartThread(message: string, imageUrls?: string[]) {
    const res = await createProjectConversation(token, projectId, { message });
    onNavigateToConversation(res.id, message, imageUrls);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-sm text-[color:var(--text-2)]">Loading…</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="text-center">
          <p className="text-sm text-[color:var(--text-2)]">{error ?? "Project not found."}</p>
          <button
            onClick={() => void loadProject()}
            className="mt-3 text-xs text-[color:var(--accent)] hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8">
        <div className="mx-auto w-full max-w-2xl space-y-6">

          {/* ── Project Identity Header ─────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <WorkspaceIcon className="shrink-0 text-[color:var(--accent)]" />
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--text-2)]">
                  Project
                </span>
              </div>

              {renaming ? (
                <div className="mt-1">
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void commitRename();
                      if (e.key === "Escape") setRenaming(false);
                    }}
                    onBlur={commitRename}
                    className={[
                      "w-full rounded-[var(--radius-md)] border bg-[color:var(--bg-2)] px-3 py-1.5",
                      "text-xl font-semibold tracking-tight text-[color:var(--text-0)] focus:outline-none transition",
                      renameValue.length >= 50
                        ? "border-red-500/70"
                        : "border-[color:var(--accent)]",
                    ].join(" ")}
                    disabled={saveRenaming}
                    maxLength={50}
                  />
                  <div className="mt-1 flex items-center justify-between">
                    {renameValue.length >= 50 ? (
                      <p className="text-xs text-red-400">Name cannot exceed 50 characters.</p>
                    ) : (
                      <span />
                    )}
                    {renameValue.length >= 40 && (
                      <span className={[
                        "text-xs tabular-nums",
                        renameValue.length >= 50 ? "text-red-400" : "text-[color:var(--text-2)]",
                      ].join(" ")}>
                        {renameValue.length} / 50
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-[color:var(--text-0)]">
                  {project.name}
                </h1>
              )}

              {project.description && !renaming ? (
                <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--text-2)]">
                  {project.description}
                </p>
              ) : null}
            </div>

            {/* Actions menu */}
            <div ref={actionsRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setActionsOpen((v) => !v)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-0)] bg-[color:var(--bg-2)] text-[color:var(--text-2)] hover:bg-[color:var(--bg-3)] hover:text-[color:var(--text-0)] transition"
                aria-label="Project actions"
                title="Project actions"
              >
                <DotsIcon />
              </button>

              {actionsOpen && (
                <div className="absolute right-0 top-full mt-2 z-30 min-w-[160px] rounded-[var(--radius-md)] border border-[color:var(--border-0)] bg-[color:var(--bg-2)] py-1 shadow-xl">
                  <ActionItem onClick={beginRename}>
                    <PencilIcon />
                    Rename
                  </ActionItem>
                  <div className="my-1 h-px bg-[color:var(--border-0)]" />
                  <ActionItem
                    onClick={() => { setConfirmDelete(true); setActionsOpen(false); }}
                    danger
                  >
                    <TrashIcon />
                    Delete project
                  </ActionItem>
                </div>
              )}
            </div>
          </div>

          {/* ── Overview Card ───────────────────────────────────────────── */}
          <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-0)] bg-[color:var(--bg-2)] p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--text-2)]">
                Project overview
              </span>
              <span className="ml-auto inline-flex items-center gap-1 rounded border border-[color:var(--border-0)] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-2)]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--text-2)] opacity-50" />
                Memory · Off
              </span>
            </div>

            {project.summary ? (
              <p className="text-sm leading-relaxed text-[color:var(--text-1)]">
                {project.summary}
              </p>
            ) : project.description ? (
              <p className="text-sm leading-relaxed text-[color:var(--text-1)]">
                {project.description}
              </p>
            ) : (
              <p className="text-sm italic text-[color:var(--text-2)]">
                No overview yet. Conversations here will build shared context over time.
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <MetaPill label="Shared context" placeholder />
              <MetaPill label="Sources" placeholder />
            </div>
          </div>

          {/* ── Thread Starter ──────────────────────────────────────────── */}
          <ThreadComposer token={token} onSubmit={handleStartThread} />

          {/* ── Conversations ───────────────────────────────────────────── */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--text-2)]">
                Threads
              </span>
              {conversations.length > 0 && (
                <span className="rounded-full bg-[color:var(--bg-3)] px-1.5 py-0.5 text-[10px] text-[color:var(--text-2)]">
                  {conversations.length}
                </span>
              )}
            </div>

            {loadingConvs ? (
              <div className="py-6 text-center text-sm text-[color:var(--text-2)]">Loading…</div>
            ) : conversations.length === 0 ? (
              <EmptyThreadsState />
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <ConversationRow
                    key={conv.id}
                    conv={conv}
                    onClick={() => onNavigateToConversation(conv.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Metadata Strip ──────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[color:var(--border-0)] pt-4">
            <MetaItem label="Created" value={formatDate(project.created_at)} />
            {project.last_activity_at && (
              <MetaItem label="Last activity" value={relativeTime(project.last_activity_at)} />
            )}
            <MetaItem
              label="Threads"
              value={String(project.conversation_count ?? conversations.length)}
            />
          </div>

        </div>
      </div>

      {/* ── Delete Confirmation ─────────────────────────────────────────── */}
      {confirmDelete && (
        <DeleteConfirmOverlay
          projectName={project.name}
          conversationCount={project.conversation_count ?? conversations.length}
          deleting={deleting}
          error={deleteError}
          onCancel={() => { setConfirmDelete(false); setDeleteError(null); }}
          onConfirm={() => void handleDelete()}
        />
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ConversationRow({
  conv,
  onClick,
}: {
  conv: ProjectConversationDTO;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-3 rounded-[var(--radius-md)] px-3 py-3 text-left transition-all duration-150 hover:bg-[color:var(--bg-3)]"
    >
      <div className="mt-0.5 shrink-0 text-[color:var(--text-2)] group-hover:text-[color:var(--text-1)] transition-colors duration-150">
        <ThreadIcon />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className="truncate text-sm font-medium text-[color:var(--text-0)]">
            {conv.title}
          </span>
          <span className="shrink-0 text-[11px] text-[color:var(--text-2)] mt-0.5">
            {relativeTime(conv.updated_at)}
          </span>
        </div>
        {conv.preview && (
          <p className="mt-0.5 truncate text-xs text-[color:var(--text-2)]">{conv.preview}</p>
        )}
      </div>

      <div className="shrink-0 opacity-0 group-hover:opacity-30 transition-opacity duration-150 mt-0.5 text-[color:var(--text-1)]">
        <ChevronRightIcon />
      </div>
    </button>
  );
}

function EmptyThreadsState() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[color:var(--border-0)] px-6 py-10 text-center">
      <pre
        aria-hidden="true"
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Consolas, monospace",
          fontSize: "1.35rem",
          lineHeight: "1.55",
          letterSpacing: "0.04em",
        }}
        className="mb-4 select-none text-[color:var(--text-2)] opacity-60"
      >
        {"  ≋  ≋≋  ≋  \n"}
        {"  (˶ᵔ ᴥ ᵔ˶) \n"}
        {"   ╰─────╯  "}
      </pre>
      <p className="text-sm font-medium text-[color:var(--text-1)]">No threads yet</p>
      <p className="mt-1 text-xs text-[color:var(--text-2)]">
        Threads started here share project context and memory.
      </p>
    </div>
  );
}

function MetaPill({ label, placeholder }: { label: string; placeholder?: boolean }) {
  return (
    <div
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]",
        placeholder
          ? "border-[color:var(--border-0)] text-[color:var(--text-2)] opacity-50"
          : "border-[color:var(--border-0)] text-[color:var(--text-1)]",
      ].join(" ")}
    >
      {label}
      {placeholder && (
        <span className="text-[9px] uppercase tracking-[0.1em] opacity-70">soon</span>
      )}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-[color:var(--text-2)]">
      <span>{label}</span>
      <span className="text-[color:var(--text-1)]">{value}</span>
    </div>
  );
}

function ActionItem({
  onClick,
  danger,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition",
        danger
          ? "text-red-400 hover:bg-red-500/10"
          : "text-[color:var(--text-0)] hover:bg-[color:var(--bg-3)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function DeleteConfirmOverlay({
  projectName,
  conversationCount,
  deleting,
  error,
  onCancel,
  onConfirm,
}: {
  projectName: string;
  conversationCount: number;
  deleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-[var(--radius-lg)] border border-[color:var(--border-0)] bg-[color:var(--bg-1)] p-6 shadow-2xl">
        <h3 className="text-base font-semibold text-[color:var(--text-0)]">Delete project?</h3>

        {conversationCount > 0 ? (
          <p className="mt-2 text-sm text-[color:var(--text-2)]">
            <span className="font-medium text-[color:var(--text-1)]">&ldquo;{projectName}&rdquo;</span>{" "}
            has {conversationCount} thread{conversationCount !== 1 ? "s" : ""}. Remove all threads
            before deleting, or the project cannot be deleted.
          </p>
        ) : (
          <p className="mt-2 text-sm text-[color:var(--text-2)]">
            <span className="font-medium text-[color:var(--text-1)]">&ldquo;{projectName}&rdquo;</span>{" "}
            will be permanently removed. This cannot be undone.
          </p>
        )}

        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-[var(--radius-md)] border border-[color:var(--border-0)] py-2 text-sm text-[color:var(--text-1)] hover:bg-[color:var(--bg-3)] transition"
          >
            Cancel
          </button>
          {conversationCount === 0 && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className="flex-1 rounded-[var(--radius-md)] bg-red-500/90 py-2 text-sm font-medium text-white hover:bg-red-500 transition disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function WorkspaceIcon({ className }: { className?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true" className={className}>
      <rect x="0.6" y="0.6" width="11.8" height="11.8" rx="2.4" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="6.5" cy="6.5" r="1.6" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="3" cy="7" r="1.2" fill="currentColor" />
      <circle cx="7" cy="7" r="1.2" fill="currentColor" />
      <circle cx="11" cy="7" r="1.2" fill="currentColor" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M9 2l2 2-7 7H2V9l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M2 3.5h9M5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M10.5 3.5l-.5 7a.5.5 0 01-.5.5h-5a.5.5 0 01-.5-.5l-.5-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function ThreadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M2 2.5h9a.5.5 0 01.5.5v5a.5.5 0 01-.5.5H7l-2.5 2V8.5H2a.5.5 0 01-.5-.5V3a.5.5 0 01.5-.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M4.5 2.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

