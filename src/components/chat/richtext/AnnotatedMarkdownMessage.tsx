"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";
import { copyTableElement } from "@/lib/tableClipboard";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm as micromarkGfm } from "micromark-extension-gfm";
import type {
  Root,
  Content,
  Parent,
  Text as MdastText,
  InlineCode,
  Table,
  TableRow,
  TableCell,
} from "mdast";
import type { AnnotationDTO } from "@/lib/annotations";
import type { CommentThreadDTO } from "@/lib/comments";
import { SelectionToolbar } from "./SelectionToolbar";
import { buildLeaf, resetLeafCounter } from "./highlight-utils";
import {
  splitLeafByDecorations,
  toCommentRanges,
  toHighlightRanges,
  getSelectionSnapshot,
} from "./comment-utils";
import type { MarkdownLeaf, MarkdownLeafMark } from "./types";
import type { DecoratedLeafSegment } from "./comment-types";

type SelectionRange = {
  start: number;
  end: number;
};

type Props = {
  content: string;
  annotations: AnnotationDTO[];
  commentThreads: CommentThreadDTO[];
  onCreateHighlight: (range: { start: number; end: number }) => Promise<void>;
  onRemoveHighlightRange: (range: { start: number; end: number }) => Promise<void>;
  onCreateComment: (
    range: { start: number; end: number },
    selectedTextSnapshot: string,
  ) => Promise<void>;
  onOpenCommentThread: (threadId: string) => void;
  onSelectionToolbarVisibleChange?: (visible: boolean) => void;
  mobileFooterOffset?: number;
};

type RenderContext = {
  leaves: MarkdownLeaf[];
};

const HIGHLIGHT_STYLE = "rgba(250, 204, 21, 0.30)";
const COMMENT_STYLE = "rgba(96, 165, 250, 0.22)";

function detectIOSSafari() {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent;
  const isIOS =
    /iP(ad|hone|od)/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const isWebKit = /WebKit/i.test(ua);
  const isCriOS = /CriOS/i.test(ua);
  const isFxiOS = /FxiOS/i.test(ua);
  const isEdgiOS = /EdgiOS/i.test(ua);

  return isIOS && isWebKit && !isCriOS && !isFxiOS && !isEdgiOS;
}

export function AnnotatedMarkdownMessage(props: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const mobileToolbarTimerRef = useRef<number | null>(null);

  const [selection, setSelection] = useState<SelectionRange | null>(null);
  const [selectionTextSnapshot, setSelectionTextSnapshot] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [isIOSSafari, setIsIOSSafari] = useState(false);
  const [showMobileSelectionToolbar, setShowMobileSelectionToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(
    null,
  );

  const highlightRanges = useMemo(() => toHighlightRanges(props.annotations), [props.annotations]);
  const commentRanges = useMemo(
    () => toCommentRanges(props.commentThreads),
    [props.commentThreads],
  );

  const highlightCoverage = useMemo(() => {
    if (!selection) {
      return {
        canAddHighlight: false,
        canRemoveHighlight: false,
      };
    }
    return getHighlightCoverageState(selection, props.annotations);
  }, [props.annotations, selection]);

  const rendered = useMemo(() => {
    resetLeafCounter();

    const tree = fromMarkdown(props.content, {
      extensions: [micromarkGfm()],
      mdastExtensions: [gfmFromMarkdown()],
    }) as Root;
    const context: RenderContext = { leaves: [] };

    const node = renderRoot(
      tree,
      context,
      highlightRanges,
      commentRanges,
      isMobile,
      props.onOpenCommentThread,
    );

    return { node, leaves: context.leaves };
  }, [props.content, highlightRanges, commentRanges, isMobile, props.onOpenCommentThread]);

  function clearSelectionUI() {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    setSelectionTextSnapshot("");
    setToolbarPosition(null);
    setShowMobileSelectionToolbar(false);
  }

  function updateToolbarFromCurrentSelection() {
    const root = rootRef.current;
    if (!root || isMobile) return;

    const domSelection = window.getSelection();
    if (!domSelection || domSelection.rangeCount === 0 || domSelection.isCollapsed) {
      setToolbarPosition(null);
      return;
    }

    const range = domSelection.getRangeAt(0);

    if (!root.contains(range.commonAncestorContainer)) {
      setToolbarPosition(null);
      return;
    }

    if (!isRangeVisibleInViewport(range)) {
      setToolbarPosition(null);
      return;
    }

    setToolbarPosition(computeDesktopToolbarPosition(range));
  }

  function syncSelectionStateFromDOM() {
    const root = rootRef.current;
    if (!root) return;

    const domSelection = window.getSelection();
    if (!domSelection || domSelection.rangeCount === 0 || domSelection.isCollapsed) {
      setSelection(null);
      setSelectionTextSnapshot("");
      setToolbarPosition(null);
      setShowMobileSelectionToolbar(false);
      return;
    }

    const range = domSelection.getRangeAt(0);
    const next = getSelectionRawRange(root);

    if (!next) {
      setSelection(null);
      setSelectionTextSnapshot("");
      setToolbarPosition(null);
      setShowMobileSelectionToolbar(false);
      return;
    }

    setSelection(next);
    setSelectionTextSnapshot(props.content.slice(next.start, next.end));

    if (!isMobile) {
      if (!root.contains(range.commonAncestorContainer)) {
        setToolbarPosition(null);
        return;
      }

      if (!isRangeVisibleInViewport(range)) {
        setToolbarPosition(null);
        return;
      }

      setToolbarPosition(computeDesktopToolbarPosition(range));
    } else {
      setToolbarPosition(null);
    }
  }

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    setIsIOSSafari(detectIOSSafari());
    const handler = () => sync();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    function handleSelectionChange() {
      syncSelectionStateFromDOM();
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [isMobile, props.content]);

  useEffect(() => {
    if (!isMobile) return;

    let timeoutId: number | null = null;
    let safariFollowupId: number | null = null;

    const handleTouchEnd = () => {
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
      if (safariFollowupId != null) {
        window.clearTimeout(safariFollowupId);
      }

      timeoutId = window.setTimeout(() => {
        syncSelectionStateFromDOM();

        if (isIOSSafari) {
          safariFollowupId = window.setTimeout(() => {
            syncSelectionStateFromDOM();
          }, 120);
        }
      }, 60);
    };

    document.addEventListener("touchend", handleTouchEnd, true);

    return () => {
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
      if (safariFollowupId != null) {
        window.clearTimeout(safariFollowupId);
      }
      document.removeEventListener("touchend", handleTouchEnd, true);
    };
  }, [isMobile, isIOSSafari, props.content]);

  useEffect(() => {
    if (!isMobile) {
      setShowMobileSelectionToolbar(false);
      return;
    }

    if (mobileToolbarTimerRef.current != null) {
      window.clearTimeout(mobileToolbarTimerRef.current);
      mobileToolbarTimerRef.current = null;
    }

    if (!selection) {
      setShowMobileSelectionToolbar(false);
      return;
    }

    if (isIOSSafari) {
      setShowMobileSelectionToolbar(false);

      mobileToolbarTimerRef.current = window.setTimeout(() => {
        const text = window.getSelection()?.toString()?.trim();
        if (text) {
          setShowMobileSelectionToolbar(true);
        }
      }, 160);
    } else {
      setShowMobileSelectionToolbar(true);
    }

    return () => {
      if (mobileToolbarTimerRef.current != null) {
        window.clearTimeout(mobileToolbarTimerRef.current);
        mobileToolbarTimerRef.current = null;
      }
    };
  }, [isMobile, isIOSSafari, selection]);

  useEffect(() => {
    if (!props.onSelectionToolbarVisibleChange) return;

    if (!isMobile) {
      props.onSelectionToolbarVisibleChange(false);
      return;
    }

    props.onSelectionToolbarVisibleChange(showMobileSelectionToolbar);
  }, [isMobile, showMobileSelectionToolbar, props.onSelectionToolbarVisibleChange]);

  useEffect(() => {
    if (isMobile || !selection) return;

    let frame = 0;

    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        updateToolbarFromCurrentSelection();
      });
    };

    window.addEventListener("scroll", scheduleUpdate, true);
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate, true);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [isMobile, selection]);

  return (
    <div className="relative">
      <SelectionToolbar
        visible={isMobile ? showMobileSelectionToolbar : !!selection && !!toolbarPosition}
        isMobile={isMobile}
        position={toolbarPosition}
        canAddHighlight={highlightCoverage.canAddHighlight}
        canRemoveHighlight={highlightCoverage.canRemoveHighlight}
        canComment={!!selection}
        onHighlight={() => {
          if (!selection) return;
          void props.onCreateHighlight(selection).then(() => {
            clearSelectionUI();
          });
        }}
        onRemove={() => {
          if (!selection) return;
          void props.onRemoveHighlightRange(selection).then(() => {
            clearSelectionUI();
          });
        }}
        onComment={() => {
          if (!selection) return;

          const snapshot = selectionTextSnapshot || getSelectionSnapshot(props.content, selection);
          const range = selection;

          window.getSelection()?.removeAllRanges();
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }

          setSelection(null);
          setSelectionTextSnapshot("");
          setToolbarPosition(null);
          setShowMobileSelectionToolbar(false);

          window.setTimeout(() => {
            void props.onCreateComment(range, snapshot);
          }, 60);
        }}
        onDismiss={() => {
          clearSelectionUI();
        }}
        mobileFooterOffset={props.mobileFooterOffset}
      />

      <div ref={rootRef} className="rhea-markdown text-[14px] leading-6 text-[color:var(--text-0)]">
        {rendered.node}
      </div>
    </div>
  );
}

function renderRoot(
  root: Root,
  context: RenderContext,
  highlights: { id: string; start: number; end: number }[],
  comments: {
    threadId: string;
    start: number;
    end: number;
    createdAt: string;
    updatedAt: string;
  }[],
  isMobile: boolean,
  onOpenCommentThread: (threadId: string) => void,
) {
  return (
    <>
      {root.children.map((child, index) => (
        <Fragment key={`root-${index}`}>
          {renderNode(child, context, highlights, comments, {}, isMobile, onOpenCommentThread)}
        </Fragment>
      ))}
    </>
  );
}

function renderNode(
  node: Content,
  context: RenderContext,
  highlights: { id: string; start: number; end: number }[],
  comments: {
    threadId: string;
    start: number;
    end: number;
    createdAt: string;
    updatedAt: string;
  }[],
  marks: MarkdownLeafMark,
  isMobile: boolean,
  onOpenCommentThread: (threadId: string) => void,
): React.ReactNode {
  switch (node.type) {
    case "paragraph":
      return (
        <p>
          {renderChildren(
            node,
            context,
            highlights,
            comments,
            marks,
            isMobile,
            onOpenCommentThread,
          )}
        </p>
      );

    case "heading": {
      const level = Math.min(node.depth, 6);
      const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

      const className =
        node.depth === 1
          ? "mt-6 mb-3 text-2xl font-semibold"
          : node.depth === 2
            ? "mt-5 mb-3 text-xl font-semibold"
            : "mt-4 mb-2 text-lg font-semibold";

      return (
        <Tag className={className}>
          {renderChildren(
            node,
            context,
            highlights,
            comments,
            marks,
            isMobile,
            onOpenCommentThread,
          )}
        </Tag>
      );
    }

    case "blockquote":
      return (
        <blockquote className="my-4 border-l-2 border-[color:var(--border-0)] pl-4 text-[color:var(--text-1)]">
          {renderChildren(
            node,
            context,
            highlights,
            comments,
            marks,
            isMobile,
            onOpenCommentThread,
          )}
        </blockquote>
      );

    case "list":
      return node.ordered ? (
        <ol className="my-3 list-decimal pl-6">
          {node.children.map((child, index) => (
            <Fragment key={`ol-${index}`}>
              {renderNode(
                child,
                context,
                highlights,
                comments,
                marks,
                isMobile,
                onOpenCommentThread,
              )}
            </Fragment>
          ))}
        </ol>
      ) : (
        <ul className="my-3 list-disc pl-6">
          {node.children.map((child, index) => (
            <Fragment key={`ul-${index}`}>
              {renderNode(
                child,
                context,
                highlights,
                comments,
                marks,
                isMobile,
                onOpenCommentThread,
              )}
            </Fragment>
          ))}
        </ul>
      );

    case "listItem":
      return (
        <li>
          {renderChildren(
            node,
            context,
            highlights,
            comments,
            marks,
            isMobile,
            onOpenCommentThread,
          )}
        </li>
      );

    case "strong":
      return renderChildren(
        node,
        context,
        highlights,
        comments,
        { ...marks, bold: true },
        isMobile,
        onOpenCommentThread,
      );

    case "emphasis":
      return renderChildren(
        node,
        context,
        highlights,
        comments,
        { ...marks, italic: true },
        isMobile,
        onOpenCommentThread,
      );

    case "link":
      return (
        <a
          href={node.url}
          target="_blank"
          rel="noreferrer"
          className="text-[color:var(--accent)] underline underline-offset-2"
        >
          {renderChildren(
            node,
            context,
            highlights,
            comments,
            { ...marks, linkHref: node.url },
            isMobile,
            onOpenCommentThread,
          )}
        </a>
      );

    case "inlineCode":
      return renderInlineCode(
        node,
        context,
        highlights,
        comments,
        marks,
        isMobile,
        onOpenCommentThread,
      );

    case "text":
      return renderTextLeaf(
        node,
        context,
        highlights,
        comments,
        marks,
        isMobile,
        onOpenCommentThread,
      );

    case "break":
      return <br />;

    case "thematicBreak":
      return <hr className="my-5 border-[color:var(--border-0)]" />;

    case "table":
      return renderTable(node, context, highlights, comments, isMobile, onOpenCommentThread);

    case "tableRow":
      return renderTableRow(node, context, highlights, comments, isMobile, onOpenCommentThread);

    case "tableCell":
      return renderTableCell(
        node,
        context,
        highlights,
        comments,
        marks,
        isMobile,
        onOpenCommentThread,
      );

    case "code":
      return (
        <pre className="my-4 overflow-x-auto rounded-[var(--radius-md)] border border-[color:var(--border-0)] bg-[color:var(--bg-1)] p-4 text-sm">
          <code>{node.value}</code>
        </pre>
      );

    default:
      return null;
  }
}

function renderChildren(
  node: Parent,
  context: RenderContext,
  highlights: { id: string; start: number; end: number }[],
  comments: {
    threadId: string;
    start: number;
    end: number;
    createdAt: string;
    updatedAt: string;
  }[],
  marks: MarkdownLeafMark,
  isMobile: boolean,
  onOpenCommentThread: (threadId: string) => void,
) {
  return node.children.map((child, index) => (
    <Fragment key={`${node.type}-${index}`}>
      {renderNode(child, context, highlights, comments, marks, isMobile, onOpenCommentThread)}
    </Fragment>
  ));
}

function TableBlock({ headerRow, bodyRows }: { headerRow?: TableRow; bodyRows: TableRow[] }) {
  const tableRef = useRef<HTMLTableElement | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const table = tableRef.current;
    if (!table) return;

    await copyTableElement(table);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="my-4" data-no-annotation="true">
      <div className="overflow-x-auto rounded-[var(--radius-md)] bg-transparent">
        <table
          ref={tableRef}
          className="w-full overflow-hidden rounded-[var(--radius-md)] border-collapse bg-[color:var(--bg-1)] text-sm"
        >
          {headerRow ? (
            <thead className="bg-black/40">{renderTableRowPlain(headerRow, true)}</thead>
          ) : null}
          {bodyRows.length > 0 ? (
            <tbody>
              {bodyRows.map((row, index) => (
                <Fragment key={`tbody-row-${index}`}>{renderTableRowPlain(row, false)}</Fragment>
              ))}
            </tbody>
          ) : null}
        </table>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Table copied" : "Copy table"}
          title={copied ? "Copied" : "Copy table"}
          className={[
            "inline-flex h-8 w-8 items-center justify-center rounded-lg",
            "bg-white/[0.03] text-[color:var(--text-1)]",
            "ring-1 ring-inset ring-white/[0.06]",
            "transition-all duration-200 ease-out",
            copied
              ? "bg-white/[0.08] text-[color:var(--text-0)] ring-white/[0.14]"
              : "hover:bg-white/[0.06] hover:text-[color:var(--text-0)] hover:ring-white/[0.1]",
            "active:scale-[0.96]",
          ].join(" ")}
        >
          {copied ? <Check size={15} strokeWidth={2.25} /> : <Copy size={15} strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
}

function renderTable(
  node: Table,
  _context: RenderContext,
  _highlights: { id: string; start: number; end: number }[],
  _comments: {
    threadId: string;
    start: number;
    end: number;
    createdAt: string;
    updatedAt: string;
  }[],
  _isMobile: boolean,
  _onOpenCommentThread: (threadId: string) => void,
) {
  const headerRow = node.children[0];
  const bodyRows = node.children.slice(1);
  return <TableBlock headerRow={headerRow} bodyRows={bodyRows} />;
}

function renderTableRow(
  node: TableRow,
  _context: RenderContext,
  _highlights: { id: string; start: number; end: number }[],
  _comments: {
    threadId: string;
    start: number;
    end: number;
    createdAt: string;
    updatedAt: string;
  }[],
  _isMobile: boolean,
  _onOpenCommentThread: (threadId: string) => void,
  isHeader = false,
) {
  return renderTableRowPlain(node, isHeader);
}

function renderTableRowPlain(node: TableRow, isHeader = false) {
  return (
    <tr className="border-b border-[color:var(--border-0)] last:border-b-0">
      {node.children.map((cell, index) => (
        <Fragment key={`cell-${index}`}>{renderTableCellPlain(cell, isHeader)}</Fragment>
      ))}
    </tr>
  );
}

function renderTableCell(
  node: TableCell,
  _context: RenderContext,
  _highlights: { id: string; start: number; end: number }[],
  _comments: {
    threadId: string;
    start: number;
    end: number;
    createdAt: string;
    updatedAt: string;
  }[],
  _marks: MarkdownLeafMark,
  _isMobile: boolean,
  _onOpenCommentThread: (threadId: string) => void,
  isHeader = false,
) {
  return renderTableCellPlain(node, isHeader);
}

function renderTableCellPlain(node: TableCell, isHeader = false) {
  const Tag = isHeader ? "th" : "td";

  return (
    <Tag
      className={[
        "min-w-[140px] border-r border-[color:var(--border-0)] px-4 py-3 text-left align-top last:border-r-0",
        isHeader ? "font-semibold text-[color:var(--text-0)]" : "text-[color:var(--text-0)]",
      ].join(" ")}
      data-no-annotation="true"
    >
      {renderChildrenWithoutAnnotation(node)}
    </Tag>
  );
}

function renderChildrenWithoutAnnotation(node: Parent): React.ReactNode {
  return node.children.map((child, index) => (
    <Fragment key={`plain-${node.type}-${index}`}>{renderNodeWithoutAnnotation(child)}</Fragment>
  ));
}

function renderNodeWithoutAnnotation(node: Content): React.ReactNode {
  switch (node.type) {
    case "text":
      return node.value;
    case "strong":
      return <strong>{renderChildrenWithoutAnnotation(node)}</strong>;
    case "emphasis":
      return <em>{renderChildrenWithoutAnnotation(node)}</em>;
    case "inlineCode":
      return (
        <code className="rounded bg-[color:var(--bg-1)] px-1.5 py-0.5 text-[13px]">
          {node.value}
        </code>
      );
    case "link":
      return (
        <a
          href={node.url}
          target="_blank"
          rel="noreferrer"
          className="text-[color:var(--accent)] underline underline-offset-2"
        >
          {renderChildrenWithoutAnnotation(node)}
        </a>
      );
    case "break":
      return <br />;
    default:
      if ("children" in node && Array.isArray(node.children)) {
        return renderChildrenWithoutAnnotation(node as Parent);
      }
      return null;
  }
}

function renderInlineCode(
  node: InlineCode,
  context: RenderContext,
  highlights: { id: string; start: number; end: number }[],
  comments: {
    threadId: string;
    start: number;
    end: number;
    createdAt: string;
    updatedAt: string;
  }[],
  marks: MarkdownLeafMark,
  isMobile: boolean,
  onOpenCommentThread: (threadId: string) => void,
) {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (typeof start !== "number" || typeof end !== "number") {
    return <code>{node.value}</code>;
  }

  const rawValueStart = start + 1;
  const rawValueEnd = end - 1;

  const leaf = buildLeaf(node.value, rawValueStart, rawValueEnd, { ...marks, code: true });
  if (!leaf) return <code>{node.value}</code>;

  context.leaves.push(leaf);
  const segments = splitLeafByDecorations(leaf, highlights, comments);

  return (
    <code className="rounded bg-[color:var(--bg-1)] px-1.5 py-0.5 text-[13px]">
      {segments.map((segment) => renderSegment(segment, isMobile, onOpenCommentThread))}
    </code>
  );
}

function renderTextLeaf(
  node: MdastText,
  context: RenderContext,
  highlights: { id: string; start: number; end: number }[],
  comments: {
    threadId: string;
    start: number;
    end: number;
    createdAt: string;
    updatedAt: string;
  }[],
  marks: MarkdownLeafMark,
  isMobile: boolean,
  onOpenCommentThread: (threadId: string) => void,
) {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;

  if (typeof start !== "number" || typeof end !== "number") {
    return node.value;
  }

  const leaf = buildLeaf(node.value, start, end, marks);
  if (!leaf) return node.value;

  context.leaves.push(leaf);
  const segments = splitLeafByDecorations(leaf, highlights, comments);

  return segments.map((segment) => renderSegment(segment, isMobile, onOpenCommentThread));
}

function renderSegment(
  segment: DecoratedLeafSegment,
  isMobile: boolean,
  onOpenCommentThread: (threadId: string) => void,
) {
  const isCommented = segment.commentThreadIds.length > 0;
  const desktopClickable = !isMobile && isCommented && !!segment.topCommentThreadId;

  const className = [
    segment.marks.bold ? "font-semibold" : "",
    segment.marks.italic ? "italic" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      key={segment.key}
      data-raw-start={segment.rawStart}
      data-raw-end={segment.rawEnd}
      data-comment-thread-ids={isCommented ? segment.commentThreadIds.join(",") : undefined}
      className={className || undefined}
      onClick={
        desktopClickable
          ? () => {
              const selected = window.getSelection()?.toString();
              if (selected && selected.trim()) return;
              if (!segment.topCommentThreadId) return;
              onOpenCommentThread(segment.topCommentThreadId);
            }
          : undefined
      }
      style={{
        backgroundColor: isCommented
          ? COMMENT_STYLE
          : segment.highlighted
            ? HIGHLIGHT_STYLE
            : undefined,
        boxShadow: isCommented ? "inset 0 -1px 0 rgba(96,165,250,0.65)" : undefined,
        cursor: desktopClickable ? "pointer" : undefined,
      }}
    >
      {segment.text}
    </span>
  );
}

function getHighlightCoverageState(
  selection: { start: number; end: number },
  annotations: AnnotationDTO[],
) {
  const clipped = annotations
    .filter(
      (ann) =>
        ann.type === "highlight" &&
        selection.start < ann.range_end &&
        ann.range_start < selection.end,
    )
    .map((ann) => ({
      start: Math.max(selection.start, ann.range_start),
      end: Math.min(selection.end, ann.range_end),
    }))
    .filter((seg) => seg.end > seg.start);

  const canRemoveHighlight = clipped.length > 0;

  if (clipped.length === 0) {
    return { canAddHighlight: true, canRemoveHighlight: false };
  }

  clipped.sort((a, b) => a.start - b.start);

  const merged: Array<{ start: number; end: number }> = [];
  for (const seg of clipped) {
    const last = merged[merged.length - 1];
    if (!last || seg.start > last.end) {
      merged.push({ ...seg });
    } else {
      last.end = Math.max(last.end, seg.end);
    }
  }

  let covered = 0;
  for (const seg of merged) {
    covered += seg.end - seg.start;
  }

  const total = selection.end - selection.start;
  const canAddHighlight = covered < total;

  return { canAddHighlight, canRemoveHighlight };
}

function isSelectionInsideNoAnnotationArea(range: Range, root: HTMLElement) {
  const common =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as Element)
      : range.commonAncestorContainer.parentElement;

  if (!common) return false;

  const blocked = common.closest("[data-no-annotation='true']");
  return !!blocked && root.contains(blocked);
}

function getSelectionRawRange(root: HTMLElement): SelectionRange | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;
  if (isSelectionInsideNoAnnotationArea(range, root)) return null;

  const startInfo = resolveBoundary(root, range.startContainer, range.startOffset);
  const endInfo = resolveBoundary(root, range.endContainer, range.endOffset);

  if (!startInfo || !endInfo) return null;
  if (endInfo.rawOffset <= startInfo.rawOffset) return null;

  const selectedText = range.toString();
  if (!selectedText.trim()) return null;

  return {
    start: startInfo.rawOffset,
    end: endInfo.rawOffset,
  };
}

function resolveBoundary(
  root: HTMLElement,
  container: Node,
  offset: number,
): { rawOffset: number } | null {
  const textNode = getClosestTextNode(container, offset);
  if (!textNode) return null;

  const span = textNode.parentElement?.closest(
    "[data-raw-start][data-raw-end]",
  ) as HTMLElement | null;
  if (!span || !root.contains(span)) return null;

  const rawStart = Number(span.dataset.rawStart);
  const textContent = textNode.textContent ?? "";
  const localOffset = Math.max(0, Math.min(offset, textContent.length));

  return { rawOffset: rawStart + localOffset };
}

function getClosestTextNode(container: Node, offset: number): globalThis.Text | null {
  if (container.nodeType === Node.TEXT_NODE) {
    return container as globalThis.Text;
  }

  const el = container as Element;
  const child = el.childNodes[offset] || el.childNodes[Math.max(0, offset - 1)];
  if (!child) return null;

  if (child.nodeType === Node.TEXT_NODE) {
    return child as globalThis.Text;
  }

  return firstTextDescendant(child);
}

function firstTextDescendant(node: Node): globalThis.Text | null {
  if (node.nodeType === Node.TEXT_NODE) return node as globalThis.Text;

  for (const child of Array.from(node.childNodes)) {
    const found = firstTextDescendant(child);
    if (found) return found;
  }

  return null;
}

function computeDesktopToolbarPosition(range: Range) {
  const rect = range.getBoundingClientRect();

  const toolbarWidth = 300;
  const toolbarHeight = 44;
  const gap = 10;
  const viewportPadding = 8;

  let left = rect.left + rect.width / 2;
  let top = rect.top - toolbarHeight - gap;

  if (top < viewportPadding) {
    top = rect.bottom + gap;
  }

  const minLeft = viewportPadding + toolbarWidth / 2;
  const maxLeft = window.innerWidth - viewportPadding - toolbarWidth / 2;

  left = Math.max(minLeft, Math.min(maxLeft, left));

  return { top, left };
}

function isRangeVisibleInViewport(range: Range) {
  const rect = range.getBoundingClientRect();

  if (rect.width === 0 && rect.height === 0) return false;

  const viewportTop = 16;
  const viewportBottom = window.innerHeight - 16;
  const rectCenterY = rect.top + rect.height / 2;

  return rectCenterY >= viewportTop && rectCenterY <= viewportBottom;
}
