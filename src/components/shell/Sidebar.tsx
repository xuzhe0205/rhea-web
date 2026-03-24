"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { FavoriteNavItem } from "./FavoriteNavItem";
import { ActionRowButton } from "../ui/ActionRowButton";
import { ConversationNavItem } from "../shell/ConversationNavItem";
import { PlusIcon } from "../ui/PlusIcon";

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

export function Sidebar(props: {
  open: boolean;
  onClose: () => void;

  conversations: Conversation[];
  favorites: FavoriteItem[];

  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onSelectFavorite: (fav: FavoriteItem) => void;

  onCreateConversation: () => void;
  onTogglePin: (conversationId: string, nextPinned: boolean) => Promise<void> | void;
}) {
  const navRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [pendingPinId, setPendingPinId] = useState<string | null>(null);
  const [followPinnedId, setFollowPinnedId] = useState<string | null>(null);

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
      itemEl.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "smooth",
      });
    }

    const t = window.setTimeout(() => {
      setFollowPinnedId(null);
    }, 320);

    return () => window.clearTimeout(t);
  }, [props.conversations, followPinnedId]);

  const handleTogglePin = async (conversationId: string, nextPinned: boolean) => {
    try {
      setPendingPinId(conversationId);

      if (nextPinned) {
        setFollowPinnedId(conversationId);
      } else {
        setFollowPinnedId(null);
      }

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
          <div className="flex h-16 items-center justify-between px-4">
            <Link
              href="/"
              onClick={props.onClose}
              className="flex cursor-pointer select-none items-center gap-3"
              aria-label="Go to home"
            >
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[10px] border border-[color:var(--border-0)] bg-[color:var(--bg-2)]">
                <Image
                  src="/rhea-logo.png"
                  alt="RHEA Index"
                  fill
                  className="object-contain"
                  priority
                />
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
            <SectionHeader label="Conversations" />

            <div className="mb-3 mt-2 px-1">
              <ActionRowButton onClick={props.onCreateConversation}>
                <PlusIcon />
                <span>New</span>
              </ActionRowButton>
            </div>

            <div className="space-y-1">
              {props.conversations.length === 0 ? (
                <div className="px-2 py-2 text-xs text-[color:var(--text-2)]">
                  No conversations yet.
                </div>
              ) : (
                props.conversations.map((c) => (
                  <ConversationNavItem
                    key={c.id}
                    ref={(el) => {
                      itemRefs.current[c.id] = el;
                    }}
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

            <div className="h-4" />

            <SectionHeader label="Projects" soon />
            <div className="px-2 py-2 text-xs text-[color:var(--text-2)]">Coming soon.</div>

            <div className="h-4" />

            <SectionHeader label="Favorites" />
            <div className="space-y-1">
              {props.favorites.length === 0 ? (
                <div className="px-2 py-2 text-xs text-[color:var(--text-2)]">
                  Favorite a message to save it here.
                </div>
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

            <div className="h-4" />

            <SectionHeader label="Agent" />
            <NavItem disabled>Tasks (soon)</NavItem>
            <NavItem disabled>Research Operator (soon)</NavItem>
          </nav>

          <div className="border-t border-[color:var(--border-0)] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-0)] bg-[color:var(--bg-2)] text-xs font-medium">
                N
              </div>
              <div className="min-w-0">
                <div className="truncate select-text text-sm text-[color:var(--text-0)]">
                  Account
                </div>
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

function SectionHeader({ label, soon }: { label: string; soon?: boolean }) {
  return (
    <div className="flex items-center justify-between px-2 pb-1 pt-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--text-2)]">
        {label}
      </div>
      {soon ? (
        <div className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-2)] opacity-70">
          soon
        </div>
      ) : null}
    </div>
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
      {props.active ? (
        <span className="absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-full border-l-2 border-[color:var(--accent)]" />
      ) : null}
      <span className="ml-1 truncate select-text">{props.children}</span>
    </button>
  );
}
