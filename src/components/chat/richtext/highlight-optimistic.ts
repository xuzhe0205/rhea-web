import type { AnnotationDTO } from "@/lib/annotations";

type Range = {
  start: number;
  end: number;
};

function overlaps(a: Range, b: Range) {
  return a.start < b.end && b.start < a.end;
}

function mergeRanges(ranges: Range[]): Range[] {
  if (ranges.length === 0) return [];

  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: Range[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i += 1) {
    const curr = sorted[i];
    const last = merged[merged.length - 1];

    if (curr.start <= last.end) {
      last.end = Math.max(last.end, curr.end);
    } else {
      merged.push({ ...curr });
    }
  }

  return merged;
}

function subtractRange(source: Range, removal: Range): Range[] {
  if (!overlaps(source, removal)) return [source];

  const result: Range[] = [];

  if (source.start < removal.start) {
    result.push({
      start: source.start,
      end: Math.min(source.end, removal.start),
    });
  }

  if (source.end > removal.end) {
    result.push({
      start: Math.max(source.start, removal.end),
      end: source.end,
    });
  }

  return result.filter((r) => r.end > r.start);
}

function normalizeHighlightAnnotations(
  annotations: AnnotationDTO[],
  messageId: string,
  convId: string,
): AnnotationDTO[] {
  const highlightRanges = annotations
    .filter((ann) => ann.type === "highlight")
    .map((ann) => ({
      start: ann.range_start,
      end: ann.range_end,
    }));

  const merged = mergeRanges(highlightRanges);

  return merged.map((range, index) => ({
    id: `optimistic-highlight-${messageId}-${range.start}-${range.end}-${index}`,
    message_id: messageId,
    conv_id: convId,
    type: "highlight" as const,
    range_start: range.start,
    range_end: range.end,
    user_note: "",
    bg_color: "#FACC15",
    extra_attrs: {},
  }));
}

export function applyOptimisticHighlightAdd(
  annotations: AnnotationDTO[],
  messageId: string,
  convId: string,
  range: Range,
): AnnotationDTO[] {
  const nonHighlights = annotations.filter((ann) => ann.type !== "highlight");
  const highlights = annotations.filter((ann) => ann.type === "highlight");

  const nextHighlights = [
    ...highlights,
    {
      id: `optimistic-add-${messageId}-${range.start}-${range.end}-${crypto.randomUUID()}`,
      message_id: messageId,
      conv_id: convId,
      type: "highlight" as const,
      range_start: range.start,
      range_end: range.end,
      user_note: "",
      bg_color: "#FACC15",
      extra_attrs: {},
    },
  ];

  return [
    ...nonHighlights,
    ...normalizeHighlightAnnotations(nextHighlights, messageId, convId),
  ];
}

export function applyOptimisticHighlightRemove(
  annotations: AnnotationDTO[],
  messageId: string,
  convId: string,
  range: Range,
): AnnotationDTO[] {
  const nonHighlights = annotations.filter((ann) => ann.type !== "highlight");
  const highlights = annotations.filter((ann) => ann.type === "highlight");

  const nextRanges: Range[] = [];

  for (const ann of highlights) {
    const pieces = subtractRange(
      { start: ann.range_start, end: ann.range_end },
      range,
    );
    nextRanges.push(...pieces);
  }

  const rebuiltHighlights = nextRanges.map((r, index) => ({
    id: `optimistic-remove-${messageId}-${r.start}-${r.end}-${index}`,
    message_id: messageId,
    conv_id: convId,
    type: "highlight" as const,
    range_start: r.start,
    range_end: r.end,
    user_note: "",
    bg_color: "#FACC15",
    extra_attrs: {},
  }));

  return [
    ...nonHighlights,
    ...normalizeHighlightAnnotations(rebuiltHighlights, messageId, convId),
  ];
}