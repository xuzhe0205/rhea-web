import type { AnnotationDTO } from "@/lib/annotations";
import type { CommentThreadDTO } from "@/lib/comments";
import type { MarkdownLeaf } from "./types";
import type { CommentRange, DecoratedLeafSegment } from "./comment-types";

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

export function toHighlightRanges(annotations: AnnotationDTO[]) {
  return annotations
    .filter((a) => a.type === "highlight" && a.range_end > a.range_start)
    .map((a) => ({
      id: a.id,
      start: a.range_start,
      end: a.range_end,
    }));
}

export function toCommentRanges(threads: CommentThreadDTO[]): CommentRange[] {
  return (threads ?? [])
    .filter((t) => t.range_end > t.range_start)
    .map((t) => ({
      threadId: t.id,
      start: t.range_start,
      end: t.range_end,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));
}

export function getSelectionSnapshot(content: string, range: { start: number; end: number }) {
  return content.slice(range.start, range.end);
}

export function splitLeafByDecorations(
  leaf: MarkdownLeaf,
  highlightRanges: { id: string; start: number; end: number }[],
  commentRanges: CommentRange[],
): DecoratedLeafSegment[] {
  const relevantHighlights = highlightRanges.filter((r) =>
    overlaps(leaf.rawStart, leaf.rawEnd, r.start, r.end),
  );

  const relevantComments = commentRanges.filter((r) =>
    overlaps(leaf.rawStart, leaf.rawEnd, r.start, r.end),
  );

  if (relevantHighlights.length === 0 && relevantComments.length === 0) {
    return [
      {
        key: `${leaf.key}-plain`,
        text: leaf.text,
        rawStart: leaf.rawStart,
        rawEnd: leaf.rawEnd,
        marks: leaf.marks,
        highlighted: false,
        commentThreadIds: [],
        topCommentThreadId: null,
      },
    ];
  }

  const boundaries = new Set<number>([leaf.rawStart, leaf.rawEnd]);

  for (const r of relevantHighlights) {
    boundaries.add(Math.max(leaf.rawStart, r.start));
    boundaries.add(Math.min(leaf.rawEnd, r.end));
  }

  for (const r of relevantComments) {
    boundaries.add(Math.max(leaf.rawStart, r.start));
    boundaries.add(Math.min(leaf.rawEnd, r.end));
  }

  const points = [...boundaries].sort((a, b) => a - b);
  const segments: DecoratedLeafSegment[] = [];

  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    if (end <= start) continue;

    const localStart = start - leaf.rawStart;
    const localEnd = end - leaf.rawStart;

    const commentHits = relevantComments
      .filter((r) => overlaps(start, end, r.start, r.end))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    segments.push({
      key: `${leaf.key}-${start}-${end}`,
      text: leaf.text.slice(localStart, localEnd),
      rawStart: start,
      rawEnd: end,
      marks: leaf.marks,
      highlighted: relevantHighlights.some((r) => overlaps(start, end, r.start, r.end)),
      commentThreadIds: commentHits.map((x) => x.threadId),
      topCommentThreadId: commentHits[0]?.threadId ?? null,
    });
  }

  return segments;
}
