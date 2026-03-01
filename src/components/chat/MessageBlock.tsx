type Msg = {
  id: string;
  senderId: string;
  senderName: string;
  role: "rhea" | "user" | "teammate";
  content: string;
};

export function MessageBlock({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  const isRhea = msg.role === "rhea";

  const ruleColor = isRhea
    ? "var(--accent)"
    : msg.role === "teammate"
    ? "var(--collab-rule)"
    : "transparent";

  const containerAlign = isUser ? "justify-end" : "justify-start";
  const blockBgVar = isUser ? "var(--bg-3)" : "var(--bg-2)";

  return (
    <div className={`flex ${containerAlign}`}>
      <div className="w-full max-w-[760px]">
        <div
          className={[
            "mb-1 text-[11px] font-medium uppercase tracking-[0.14em]",
            isUser
              ? "text-right text-[color:var(--text-2)]"
              : "text-[color:var(--text-2)]",
          ].join(" ")}
        >
          {isUser ? "You" : msg.senderName}
        </div>

        <div
          className={[
            "relative rounded-[var(--radius-lg)] border border-[color:var(--border-0)] px-4 py-3",
            isUser ? "" : "pl-5",
          ].join(" ")}
          style={{ background: `var(${blockBgVar})` }}
        >
          {!isUser ? (
            <span
              className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
              style={{ background: ruleColor }}
              aria-hidden="true"
            />
          ) : null}

          <div className="whitespace-pre-wrap text-[14px] leading-6 text-[color:var(--text-0)]">
            <MentionStyledText text={msg.content} />
          </div>

          {!isUser ? (
            <div className="mt-3 flex gap-2">
              <IconButton ariaLabel="Save to notes" icon="bookmark" />
              <IconButton ariaLabel="Favorite" icon="star" />
              <IconButton ariaLabel="Share block" icon="share" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function IconButton({
  ariaLabel,
  icon,
}: {
  ariaLabel: string;
  icon: "bookmark" | "star" | "share";
}) {
  return (
    <button
      className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border-0)] bg-[color:var(--bg-1)] text-[color:var(--text-1)] hover:bg-[color:var(--bg-3)] hover:text-[color:var(--text-0)] transition rhea-focus"
      aria-label={ariaLabel}
      title={ariaLabel}
      type="button"
    >
      {icon === "bookmark" ? <BookmarkIcon /> : null}
      {icon === "star" ? <StarIcon /> : null}
      {icon === "share" ? <ShareIcon /> : null}
    </button>
  );
}

function BookmarkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 4h10a1 1 0 0 1 1 1v16l-6-3-6 3V5a1 1 0 0 1 1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3l2.9 6 6.6.8-4.9 4.3 1.4 6.4L12 17.8 6 20.8l1.4-6.4L2.5 9.8l6.6-.8L12 3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M16 8a3 3 0 1 0-2.8-4M8 12l8-4M8 12l8 4M8 12a3 3 0 1 0 0 .01"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MentionStyledText({ text }: { text: string }) {
  const parts = splitMentions(text);
  return (
    <>
      {parts.map((p, i) => {
        if (p.type === "mention") {
          return (
            <span
              key={i}
              className="rounded-[8px] border border-[color:var(--border-0)] px-1 py-[1px]"
              style={{
                background: "rgba(94,124,226,0.12)",
                color: "rgb(201,213,255)",
              }}
            >
              {p.value}
            </span>
          );
        }
        return <span key={i}>{p.value}</span>;
      })}
    </>
  );
}

function splitMentions(
  input: string
): Array<{ type: "text" | "mention"; value: string }> {
  const re = /@\w+/g;
  const out: Array<{ type: "text" | "mention"; value: string }> = [];
  let last = 0;

  for (const m of input.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ type: "text", value: input.slice(last, idx) });
    out.push({ type: "mention", value: m[0] });
    last = idx + m[0].length;
  }
  if (last < input.length) out.push({ type: "text", value: input.slice(last) });
  return out;
}