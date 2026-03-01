type Participant = { id: string; name: string };

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const chars = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  return chars || "?";
}

export function ParticipantsBadges({
  participants,
}: {
  participants: Participant[];
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-xs text-[color:var(--text-2)]">Participants</div>
      <div className="flex -space-x-2">
        {participants.map((p) => {
          const isRhea = p.id === "rhea";
          return (
            <div
              key={p.id}
              className={[
                "flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-medium",
                "bg-[color:var(--bg-2)]",
                isRhea
                  ? "border-[color:var(--accent)] text-[color:var(--text-0)]"
                  : "border-[color:var(--border-0)] text-[color:var(--text-0)]",
              ].join(" ")}
              title={p.name}
              aria-label={p.name}
            >
              {initials(p.name)}
            </div>
          );
        })}
      </div>
    </div>
  );
}