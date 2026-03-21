type FavoriteItemProps = {
  preview: string;
  conversationTitle: string;
  active?: boolean;
  onClick?: () => void;
};

export function FavoriteNavItem(props: FavoriteItemProps) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={[
        "relative w-full rounded-[var(--radius-md)] px-3 py-2 text-left transition",
        "cursor-pointer hover:bg-[color:var(--bg-3)]",
        props.active ? "bg-[color:var(--bg-2)]" : "",
      ].join(" ")}
    >
      {props.active ? (
        <span className="absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-full border-l-2 border-[color:var(--accent)]" />
      ) : null}

      <div className="ml-1 min-w-0">
        <div className="truncate text-sm text-[color:var(--text-0)]">{props.preview}</div>
        <div className="mt-0.5 truncate text-xs text-[color:var(--text-2)]">
          {props.conversationTitle}
        </div>
      </div>
    </button>
  );
}
