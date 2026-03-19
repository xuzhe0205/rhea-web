"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createHighlightAnnotation,
  listMessageAnnotations,
  type AnnotationDTO,
} from "@/lib/annotations";

export function useMessageHighlights(token: string | null, messageId: string) {
  const [annotations, setAnnotations] = useState<AnnotationDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const highlights = useMemo(
    () => annotations.filter((a) => a.type === "highlight"),
    [annotations],
  );

  const refresh = useCallback(async () => {
    if (!token || !messageId) return;

    setLoading(true);
    try {
      const rows = await listMessageAnnotations(token, messageId);
      setAnnotations(rows ?? []);
    } catch {
      setAnnotations([]);
    } finally {
      setLoading(false);
    }
  }, [token, messageId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createHighlight = useCallback(
    async (input: {
      convId: string;
      rangeStart: number;
      rangeEnd: number;
      bgColor?: string | null;
    }) => {
      if (!token) return null;

      const res = await createHighlightAnnotation(token, {
        message_id: messageId,
        conv_id: input.convId,
        range_start: input.rangeStart,
        range_end: input.rangeEnd,
        bg_color: input.bgColor ?? "#FACC15",
      });

      await refresh();
      return res?.id ?? null;
    },
    [token, messageId, refresh],
  );

  return {
    highlights,
    loading,
    refresh,
    createHighlight,
  };
}