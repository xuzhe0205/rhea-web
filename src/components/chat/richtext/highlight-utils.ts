import type { AnnotationDTO } from "@/lib/annotations";
import type {
  HighlightRange,
  HighlightedLeafSegment,
  MarkdownLeaf,
  MarkdownLeafMark,
} from "./types";

let leafCounter = 0;

function nextLeafKey() {
  leafCounter += 1;
  return `leaf-${leafCounter}`;
}

export function resetLeafCounter() {
  leafCounter = 0;
}

export function toHighlightRanges(annotations: AnnotationDTO[]): HighlightRange[] {
  return annotations
    .filter((a) => a.type === "highlight" && a.range_end > a.range_start)
    .map((a) => ({
      id: a.id,
      start: a.range_start,
      end: a.range_end,
    }));
}

export function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

export function splitLeafByHighlights(
  leaf: MarkdownLeaf,
  ranges: HighlightRange[],
): HighlightedLeafSegment[] {
  const relevant = ranges.filter((r) =>
    overlaps(leaf.rawStart, leaf.rawEnd, r.start, r.end),
  );

  if (relevant.length === 0) {
    return [
      {
        key: `${leaf.key}-plain`,
        text: leaf.text,
        rawStart: leaf.rawStart,
        rawEnd: leaf.rawEnd,
        marks: leaf.marks,
        highlighted: false,
      },
    ];
  }

  const boundaries = new Set<number>([leaf.rawStart, leaf.rawEnd]);

  for (const r of relevant) {
    boundaries.add(Math.max(leaf.rawStart, r.start));
    boundaries.add(Math.min(leaf.rawEnd, r.end));
  }

  const points = [...boundaries].sort((a, b) => a - b);
  const segments: HighlightedLeafSegment[] = [];

  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    if (end <= start) continue;

    const localStart = start - leaf.rawStart;
    const localEnd = end - leaf.rawStart;

    segments.push({
      key: `${leaf.key}-${start}-${end}`,
      text: leaf.text.slice(localStart, localEnd),
      rawStart: start,
      rawEnd: end,
      marks: leaf.marks,
      highlighted: relevant.some((r) => overlaps(start, end, r.start, r.end)),
    });
  }

  return segments;
}

export function buildLeaf(
  text: string,
  rawStart: number,
  rawEnd: number,
  marks: MarkdownLeafMark,
): MarkdownLeaf | null {
  if (!text || rawEnd <= rawStart) return null;

  return {
    key: nextLeafKey(),
    text,
    rawStart,
    rawEnd,
    marks,
  };
}