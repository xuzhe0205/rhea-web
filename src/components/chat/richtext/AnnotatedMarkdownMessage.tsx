"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { fromMarkdown } from "mdast-util-from-markdown";
import type { Root, Content, Parent, Text as MdastText, InlineCode } from "mdast";
import type { AnnotationDTO } from "@/lib/annotations";
import { HighlightToolbar } from "./HighlightToolbar";
import {
  buildLeaf,
  resetLeafCounter,
  splitLeafByHighlights,
  toHighlightRanges,
} from "./highlight-utils";
import type { MarkdownLeaf, MarkdownLeafMark, HighlightedLeafSegment } from "./types";

type SelectionRange = {
  start: number;
  end: number;
};

type Props = {
    content: string;
    annotations: AnnotationDTO[];
    onCreateHighlight: (range: { start: number; end: number }) => Promise<void>;
    onRemoveHighlightRange: (range: { start: number; end: number }) => Promise<void>;
};

type RenderContext = {
  leaves: MarkdownLeaf[];
};

const HIGHLIGHT_STYLE = "rgba(250, 204, 21, 0.30)";

export function AnnotatedMarkdownMessage(props: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [selection, setSelection] = useState<SelectionRange | null>(null);

  const highlightRanges = useMemo(
    () => toHighlightRanges(props.annotations),
    [props.annotations],
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

    const tree = fromMarkdown(props.content) as Root;
    const context: RenderContext = { leaves: [] };

    const node = renderRoot(tree, context, highlightRanges);

    return {
      node,
      leaves: context.leaves,
    };
  }, [props.content, highlightRanges]);

  useEffect(() => {
    function handleSelectionChange() {
      const root = rootRef.current;
      if (!root) return;

      const next = getSelectionRawRange(root);
      setSelection(next);
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  return (
    <div className="relative">
      <HighlightToolbar
        visible={!!selection}
        canAddHighlight={highlightCoverage.canAddHighlight}
        canRemoveHighlight={highlightCoverage.canRemoveHighlight}
        onHighlight={() => {
            if (!selection) return;
            void props.onCreateHighlight(selection).then(() => {
            window.getSelection()?.removeAllRanges();
            setSelection(null);
            });
        }}
        onRemove={() => {
            if (!selection) return;
            void props.onRemoveHighlightRange(selection).then(() => {
            window.getSelection()?.removeAllRanges();
            setSelection(null);
            });
        }}
        onDismiss={() => {
            window.getSelection()?.removeAllRanges();
            setSelection(null);
        }}
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
) {
  return (
    <>
      {root.children.map((child, index) => (
        <Fragment key={`root-${index}`}>
          {renderNode(child, context, highlights, {})}
        </Fragment>
      ))}
    </>
  );
}

function renderNode(
  node: Content,
  context: RenderContext,
  highlights: { id: string; start: number; end: number }[],
  marks: MarkdownLeafMark,
): React.ReactNode {
  switch (node.type) {
    case "paragraph":
      return <p>{renderChildren(node, context, highlights, marks)}</p>;

    case "heading": {
        const level = Math.min(node.depth, 6);
        const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
    
        const className =
            node.depth === 1
            ? "mt-6 mb-3 text-2xl font-semibold"
            : node.depth === 2
                ? "mt-5 mb-3 text-xl font-semibold"
                : "mt-4 mb-2 text-lg font-semibold";
        
        return <Tag className={className}>{renderChildren(node, context, highlights, marks)}</Tag>;
    }

    case "blockquote":
      return (
        <blockquote className="my-4 border-l-2 border-[color:var(--border-0)] pl-4 text-[color:var(--text-1)]">
          {renderChildren(node, context, highlights, marks)}
        </blockquote>
      );

    case "list":
      return node.ordered ? (
        <ol className="my-3 list-decimal pl-6">
          {node.children.map((child, index) => (
            <Fragment key={`ol-${index}`}>
              {renderNode(child, context, highlights, marks)}
            </Fragment>
          ))}
        </ol>
      ) : (
        <ul className="my-3 list-disc pl-6">
          {node.children.map((child, index) => (
            <Fragment key={`ul-${index}`}>
              {renderNode(child, context, highlights, marks)}
            </Fragment>
          ))}
        </ul>
      );

    case "listItem":
      return <li>{renderChildren(node, context, highlights, marks)}</li>;

    case "strong":
      return renderChildren(node, context, highlights, { ...marks, bold: true });

    case "emphasis":
      return renderChildren(node, context, highlights, { ...marks, italic: true });

    case "link":
      return (
        <a
          href={node.url}
          target="_blank"
          rel="noreferrer"
          className="text-[color:var(--accent)] underline underline-offset-2"
        >
          {renderChildren(node, context, highlights, {
            ...marks,
            linkHref: node.url,
          })}
        </a>
      );

    case "inlineCode":
      return renderInlineCode(node, context, highlights, marks);

    case "text":
      return renderTextLeaf(node, context, highlights, marks);

    case "break":
      return <br />;

    case "thematicBreak":
      return <hr className="my-5 border-[color:var(--border-0)]" />;

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
  marks: MarkdownLeafMark,
) {
  return node.children.map((child, index) => (
    <Fragment key={`${node.type}-${index}`}>
      {renderNode(child, context, highlights, marks)}
    </Fragment>
  ));
}

function renderInlineCode(
  node: InlineCode,
  context: RenderContext,
  highlights: { id: string; start: number; end: number }[],
  marks: MarkdownLeafMark,
) {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (typeof start !== "number" || typeof end !== "number") {
    return <code>{node.value}</code>;
  }

  const rawValueStart = start + 1;
  const rawValueEnd = end - 1;

  const leaf = buildLeaf(node.value, rawValueStart, rawValueEnd, {
    ...marks,
    code: true,
  });

  if (!leaf) {
    return <code>{node.value}</code>;
  }

  context.leaves.push(leaf);
  const segments = splitLeafByHighlights(leaf, highlights);

  return (
    <code className="rounded bg-[color:var(--bg-1)] px-1.5 py-0.5 text-[13px]">
      {segments.map(renderSegment)}
    </code>
  );
}

function renderTextLeaf(
  node: MdastText,
  context: RenderContext,
  highlights: { id: string; start: number; end: number }[],
  marks: MarkdownLeafMark,
) {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;

  if (typeof start !== "number" || typeof end !== "number") {
    return node.value;
  }

  const leaf = buildLeaf(node.value, start, end, marks);
  if (!leaf) return node.value;

  context.leaves.push(leaf);
  const segments = splitLeafByHighlights(leaf, highlights);

  return segments.map(renderSegment);
}

function renderSegment(segment: HighlightedLeafSegment) {
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
      className={className || undefined}
      style={{
        backgroundColor: segment.highlighted ? HIGHLIGHT_STYLE : undefined,
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
        return {
        canAddHighlight: true,
        canRemoveHighlight: false,
        };
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

    return {
        canAddHighlight,
        canRemoveHighlight,
    };
}

function getSelectionRawRange(root: HTMLElement): SelectionRange | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;

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

  const span = textNode.parentElement?.closest("[data-raw-start][data-raw-end]") as HTMLElement | null;
  if (!span || !root.contains(span)) return null;

  const rawStart = Number(span.dataset.rawStart);
  const textContent = textNode.textContent ?? "";

  const localOffset = Math.max(0, Math.min(offset, textContent.length));
  return {
    rawOffset: rawStart + localOffset,
  };
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