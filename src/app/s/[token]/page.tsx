import type { Metadata } from "next";
import { fetchSharedContent, type SharedMessage } from "@/lib/share";
import { MarkdownMessage } from "@/components/chat/MarkdownMessage";
import { MarketingFooter } from "@/components/share/MarketingFooter";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = { params: Promise<{ token: string }> };

// ─── Metadata (OG tags) ───────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const data = await fetchSharedContent(token);

  const firstAssistant = data?.messages.find((m) => m.role === "assistant");
  const preview = firstAssistant?.content?.slice(0, 160) ?? "A shared conversation from RHEA Index.";
  const title = preview.slice(0, 60) + (preview.length > 60 ? "…" : "");

  return {
    title: `${title} — RHEA Index`,
    description: preview,
    openGraph: {
      title: "Shared from RHEA Index",
      description: preview,
      siteName: "RHEA Index",
      type: "article",
    },
    twitter: {
      card: "summary",
      title: "Shared from RHEA Index",
      description: preview,
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SharedPage({ params }: Props) {
  const { token } = await params;
  const data = await fetchSharedContent(token);

  if (!data || data.messages.length === 0) {
    return <NotFoundState />;
  }

  return (
    <div className="min-h-dvh bg-[color:var(--bg-0)] text-[color:var(--text-0)] flex flex-col">
      <TopBar />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 md:px-6 md:py-12">
        {/* Subtle attribution line */}
        <p className="mb-8 text-[12px] uppercase tracking-[0.14em] text-[color:var(--text-2)]">
          Shared from RHEA Index
        </p>

        {/* Messages */}
        <div className="space-y-6">
          {data.messages.map((msg) => (
            <ReadOnlyMessageBlock key={msg.id} msg={msg} />
          ))}
        </div>
      </main>

      <MarketingFooter />

    </div>
  );
}

// ─── Read-only message block ──────────────────────────────────────────────────

function ReadOnlyMessageBlock({ msg }: { msg: SharedMessage }) {
  const isUser = msg.role === "user";
  const imageUrls = msg.metadata?.image_urls ?? [];

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="ml-auto w-fit min-w-[180px] max-w-[88%] md:min-w-[220px] md:max-w-[620px]">
          <div className="mb-2 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--text-2)]">
            You
          </div>
          <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(30,38,58,0.92),rgba(25,31,47,0.96))] px-5 py-4 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]">
            {imageUrls.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {imageUrls.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={url}
                    alt={`Attached image ${i + 1}`}
                    className="h-40 max-w-[220px] rounded-2xl object-cover"
                  />
                ))}
              </div>
            )}
            <p className="break-words text-left text-sm leading-relaxed text-[color:var(--text-0)]">
              {msg.content}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[96%] md:max-w-[820px]">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--accent)]/80">
          RHEA
        </div>
        <div className="relative rounded-[var(--radius-lg)] border border-[color:var(--border-0)] bg-[color:var(--bg-2)] px-5 py-4 pl-6">
          <span
            className="absolute bottom-4 left-0 top-4 w-[3px] rounded-full bg-[color:var(--accent)]"
            aria-hidden="true"
          />
          <MarkdownMessage content={msg.content} />
        </div>
      </div>
    </div>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────────

function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-[color:var(--border-0)] bg-[color:var(--bg-0)]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6">
        {/* Logo */}
        <a
          href="/"
          className="flex items-center gap-2 text-[color:var(--text-0)] hover:opacity-80 transition"
          aria-label="RHEA Index"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rhea-logo.png" alt="RHEA Index logo" className="h-[22px] w-auto" />
          <span className="text-[15px] font-semibold tracking-tight">RHEA Index</span>
        </a>

        {/* CTAs */}
        <div className="flex items-center gap-2">
          <a
            href="/login"
            className="rounded-[var(--radius-md)] px-3 py-1.5 text-sm text-[color:var(--text-1)] hover:text-[color:var(--text-0)] transition"
          >
            Sign in
          </a>
          <a
            href="/signup"
            className="rounded-[var(--radius-md)] bg-[color:var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 transition"
          >
            Try RHEA free →
          </a>
        </div>
      </div>
    </header>
  );
}

// ─── Not found state ──────────────────────────────────────────────────────────

function NotFoundState() {
  return (
    <div className="min-h-dvh bg-[color:var(--bg-0)] text-[color:var(--text-0)] flex flex-col">
      <TopBar />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-[15px] text-[color:var(--text-1)]">
          This share link is no longer active.
        </p>
        <a
          href="/signup"
          className="rounded-[var(--radius-md)] bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
        >
          Try RHEA free →
        </a>
      </div>
    </div>
  );
}

