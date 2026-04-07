"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { FavoriteNavItem } from "./FavoriteNavItem";
import { ProjectNavItem } from "./ProjectNavItem";
import { ConversationNavItem } from "../shell/ConversationNavItem";

type Conversation = {
  id: string;
  title: string;
  updatedAt?: string;
  isPinned?: boolean;
  pinnedAt?: string | null;
};

type FavoriteItem = {
  id: string;
  conversationId: string;
  content: string;
  conversationTitle: string;
};

type Project = {
  id: string;
  name: string;
};

function readCollapsed(key: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`rhea-sidebar-${key}-collapsed`) === "true";
}

function writeCollapsed(key: string, value: boolean) {
  localStorage.setItem(`rhea-sidebar-${key}-collapsed`, String(value));
}

export function Sidebar(props: {
  open: boolean;
  onClose: () => void;

  conversations: Conversation[];
  favorites: FavoriteItem[];
  projects: Project[];

  activeConversationId: string | null;
  activeProjectId: string | null;
  onSelectConversation: (id: string) => void;
  onSelectFavorite: (fav: FavoriteItem) => void;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;

  onCreateConversation: () => void;
  onTogglePin: (conversationId: string, nextPinned: boolean) => Promise<void> | void;
}) {
  const navRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [pendingPinId, setPendingPinId] = useState<string | null>(null);
  const [followPinnedId, setFollowPinnedId] = useState<string | null>(null);

  const [convsCollapsed, setConvsCollapsed] = useState(() => readCollapsed("conversations"));
  const [projectsCollapsed, setProjectsCollapsed] = useState(() => readCollapsed("projects"));
  const [favoritesCollapsed, setFavoritesCollapsed] = useState(() => readCollapsed("favorites"));

  function toggle(
    current: boolean,
    setter: React.Dispatch<React.SetStateAction<boolean>>,
    key: string,
  ) {
    const next = !current;
    setter(next);
    writeCollapsed(key, next);
  }

  useEffect(() => {
    if (!followPinnedId) return;

    const navEl = navRef.current;
    const itemEl = itemRefs.current[followPinnedId];

    if (!navEl || !itemEl) {
      setFollowPinnedId(null);
      return;
    }

    const navRect = navEl.getBoundingClientRect();
    const itemRect = itemEl.getBoundingClientRect();

    const padding = 12;
    const above = itemRect.top < navRect.top + padding;
    const below = itemRect.bottom > navRect.bottom - padding;

    if (above || below) {
      itemEl.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    }

    const t = window.setTimeout(() => setFollowPinnedId(null), 320);
    return () => window.clearTimeout(t);
  }, [props.conversations, followPinnedId]);

  const handleTogglePin = async (conversationId: string, nextPinned: boolean) => {
    try {
      setPendingPinId(conversationId);
      if (nextPinned) setFollowPinnedId(conversationId);
      else setFollowPinnedId(null);
      await props.onTogglePin(conversationId, nextPinned);
    } finally {
      window.setTimeout(() => {
        setPendingPinId((curr) => (curr === conversationId ? null : curr));
      }, 220);
    }
  };

  return (
    <>
      <div
        className={[
          "fixed inset-0 z-20 bg-black/40 transition-opacity md:hidden",
          props.open ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={props.onClose}
        aria-hidden="true"
      />

      <aside
        className={[
          "z-30 h-full w-[280px] shrink-0 border-r border-[color:var(--border-0)] bg-[color:var(--bg-1)]",
          "md:static md:translate-x-0",
          "fixed left-0 top-0 transition-transform md:transition-none",
          props.open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4">
            <Link
              href="/"
              onClick={props.onClose}
              className="flex cursor-pointer select-none items-center gap-3"
              aria-label="Go to home"
            >
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[10px] border border-[color:var(--border-0)] bg-[color:var(--bg-2)]">
                <Image src="/rhea-logo.png" alt="RHEA Index" fill className="object-contain" priority />
              </div>
              <div className="leading-tight">
                <div className="text-[13px] font-medium tracking-[0.18em] text-[color:var(--text-0)]">
                  RHEA
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-2)]">
                  Index
                </div>
              </div>
            </Link>

            <button
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border-0)] bg-[color:var(--bg-1)] text-[color:var(--text-0)] transition hover:bg-[color:var(--bg-3)] md:hidden"
              onClick={props.onClose}
              aria-label="Close sidebar"
              title="Close sidebar"
            >
              <span className="text-[18px] leading-none">×</span>
            </button>
          </div>

          <div className="px-4 pb-2">
            <div className="h-px w-full bg-[color:var(--border-0)]" />
          </div>

          <nav ref={navRef} className="flex-1 overflow-y-auto px-2 py-2">

            {/* ── Conversations ─────────────────────────────────────────── */}
            <SectionHeader
              label="Conversations"
              collapsed={convsCollapsed}
              onToggle={() => toggle(convsCollapsed, setConvsCollapsed, "conversations")}
              onAction={props.onCreateConversation}
              actionLabel="New conversation"
            />

            {!convsCollapsed && (
              <div className="mt-1 space-y-0.5 pb-1">
                {props.conversations.length === 0 ? (
                  <EmptyHint>No conversations yet.</EmptyHint>
                ) : (
                  props.conversations.map((c) => (
                    <ConversationNavItem
                      key={c.id}
                      ref={(el) => { itemRefs.current[c.id] = el; }}
                      title={c.title}
                      active={props.activeConversationId === c.id}
                      pinned={!!c.isPinned}
                      pinPending={pendingPinId === c.id}
                      onClick={() => props.onSelectConversation(c.id)}
                      onTogglePin={() => handleTogglePin(c.id, !c.isPinned)}
                    />
                  ))
                )}
              </div>
            )}

            <div className="h-1" />

            {/* ── Projects ──────────────────────────────────────────────── */}
            <SectionHeader
              label="Projects"
              collapsed={projectsCollapsed}
              onToggle={() => toggle(projectsCollapsed, setProjectsCollapsed, "projects")}
              onAction={props.onCreateProject}
              actionLabel="New project"
            />

            {!projectsCollapsed && (
              <div className="mt-1 space-y-0.5 pb-1">
                {props.projects.length === 0 ? (
                  <EmptyHint>No projects yet.</EmptyHint>
                ) : (
                  props.projects.map((p) => (
                    <ProjectNavItem
                      key={p.id}
                      name={p.name}
                      active={props.activeProjectId === p.id}
                      onClick={() => props.onSelectProject(p.id)}
                    />
                  ))
                )}
              </div>
            )}

            <div className="h-1" />

            {/* ── Favorites ─────────────────────────────────────────────── */}
            <SectionHeader
              label="Favorites"
              collapsed={favoritesCollapsed}
              onToggle={() => toggle(favoritesCollapsed, setFavoritesCollapsed, "favorites")}
            />

            {!favoritesCollapsed && (
              <div className="mt-1 space-y-0.5 pb-1">
                {props.favorites.length === 0 ? (
                  <EmptyHint>Favorite a message to save it here.</EmptyHint>
                ) : (
                  props.favorites.map((fav) => (
                    <FavoriteNavItem
                      key={fav.id}
                      active={props.activeConversationId === fav.conversationId}
                      preview={fav.content}
                      conversationTitle={fav.conversationTitle}
                      onClick={() => props.onSelectFavorite(fav)}
                    />
                  ))
                )}
              </div>
            )}

            <div className="h-1" />

            {/* ── Agent ─────────────────────────────────────────────────── */}
            <SectionHeader label="Agent" />
            <div className="mt-1 space-y-0.5 pb-1">
              <NavItem disabled>Tasks (soon)</NavItem>
              <NavItem disabled>Research Operator (soon)</NavItem>
            </div>

          </nav>

          {/* Account footer */}
          <div className="border-t border-[color:var(--border-0)] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-0)] bg-[color:var(--bg-2)] text-xs font-medium">
                N
              </div>
              <div className="min-w-0">
                <div className="truncate select-text text-sm text-[color:var(--text-0)]">Account</div>
                <div className="truncate select-text text-xs text-[color:var(--text-2)]">
                  Settings &amp; profile
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  label,
  collapsed,
  onToggle,
  onAction,
  actionLabel,
}: {
  label: string;
  collapsed?: boolean;
  onToggle?: () => void;
  onAction?: () => void;
  actionLabel?: string;
}) {
  const collapsible = onToggle !== undefined;

  return (
    <div className="group/header flex items-center gap-1 px-1 py-1.5">
      <button
        type="button"
        onClick={onToggle}
        disabled={!collapsible}
        className={[
          "flex flex-1 items-center gap-1.5 rounded px-1 py-0.5 text-left transition-colors duration-150",
          collapsible
            ? "cursor-pointer hover:text-[color:var(--text-0)]"
            : "cursor-default",
          "text-[color:var(--text-1)]",
        ].join(" ")}
        aria-label={collapsible ? `${collapsed ? "Expand" : "Collapse"} ${label}` : undefined}
      >
        {collapsible && (
          <span
            className={[
              "flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[color:var(--text-2)] transition-transform duration-200",
              collapsed ? "" : "rotate-90",
            ].join(" ")}
          >
            <ChevronRightSmall />
          </span>
        )}
        <span className="text-[11px] font-semibold uppercase tracking-[0.13em]">
          {label}
        </span>
      </button>

      {onAction && (
        <button
          type="button"
          onClick={onAction}
          aria-label={actionLabel}
          title={actionLabel}
          className={[
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-md)] transition-all duration-150",
            "border border-[color:var(--border-0)] bg-[color:var(--bg-1)] text-[color:var(--text-1)]",
            "hover:bg-[color:var(--bg-3)] hover:text-[color:var(--text-0)]",
            "active:scale-95",
          ].join(" ")}
        >
          <PlusSmall />
        </button>
      )}
    </div>
  );
}

// ─── Small utilities ─────────────────────────────────────────────────────────

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-1.5 text-xs text-[color:var(--text-2)]">{children}</div>
  );
}

function NavItem(props: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const disabled = !!props.disabled;
  return (
    <button
      className={[
        "relative flex w-full items-center rounded-[var(--radius-md)] px-3 py-2 text-left text-sm transition",
        "text-[color:var(--text-0)]",
        disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer hover:bg-[color:var(--bg-3)]",
        props.active ? "bg-[color:var(--bg-2)]" : "",
      ].join(" ")}
      type="button"
      onClick={disabled ? undefined : props.onClick}
    >
      {props.active && (
        <span className="absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-full border-l-2 border-[color:var(--accent)]" />
      )}
      <span className="ml-1 truncate select-text">{props.children}</span>
    </button>
  );
}

function ChevronRightSmall() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
      <path d="M3 1.5l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
