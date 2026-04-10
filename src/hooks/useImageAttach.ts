"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uploadImage, deleteUploadedImage } from "@/lib/uploads";

export const MAX_IMAGES = 10;
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB per image
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const STORAGE_KEY = "rhea:pending_images";

export type AttachedImage = {
  localId: string;
  key: string | null;    // R2 object key — null while uploading
  url: string | null;    // presigned URL — null while uploading
  name: string;
  sizeBytes: number;
  mimeType: string;
  status: "uploading" | "done" | "error";
  errorMsg?: string;
};

// ─── localStorage helpers ─────────────────────────────────────────────────────

type PersistedImage = Omit<AttachedImage, "status" | "errorMsg"> & {
  key: string;
  url: string;
};

function loadPersisted(): AttachedImage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: PersistedImage[] = JSON.parse(raw);
    return parsed.map((p) => ({ ...p, status: "done" as const }));
  } catch {
    return [];
  }
}

function persist(images: AttachedImage[]) {
  try {
    const done = images.filter(
      (i): i is AttachedImage & { key: string; url: string } =>
        i.status === "done" && i.key !== null && i.url !== null,
    );
    const payload: PersistedImage[] = done.map(({ localId, key, url, name, sizeBytes, mimeType }) => ({
      localId, key, url, name, sizeBytes, mimeType,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch { /* storage full — ignore */ }
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    // Give specific guidance for the most common unsupported format
    if (file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif")) {
      return `HEIC/HEIF isn't supported. Export as JPEG from your Photos app first.`;
    }
    return `Unsupported format. Please use JPEG, PNG, WEBP, or GIF.`;
  }
  if (file.size > MAX_SIZE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `"${file.name}" is ${mb} MB — max is 10 MB per image.`;
  }
  return null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useImageAttach(token: string) {
  const [images, setImages] = useState<AttachedImage[]>(loadPersisted);
  // Ref so async upload callbacks always see latest state
  const imagesRef = useRef(images);
  useEffect(() => { imagesRef.current = images; }, [images]);

  /** Presigned URLs of successfully uploaded images — ready to send. */
  const readyUrls = images
    .filter((i) => i.status === "done" && i.url)
    .map((i) => i.url!);

  /** R2 object keys of successfully uploaded images — sent alongside URLs so the backend can persist them. */
  const readyKeys = images
    .filter((i) => i.status === "done" && i.key)
    .map((i) => i.key!);

  /**
   * Add files from a picker, drop, or paste event.
   * Returns any validation error strings (caller can surface them).
   * Upload fires immediately, state updates as each completes.
   */
  const addFiles = useCallback(
    async (files: File[]): Promise<string[]> => {
      const activeCount = imagesRef.current.filter((i) => i.status !== "error").length;
      const slots = MAX_IMAGES - activeCount;
      if (slots <= 0) return ["You've reached the 10-image limit for this message."];

      const toProcess = files.slice(0, slots);
      const errors: string[] = [];
      const batch: Array<{ stub: AttachedImage; file: File }> = [];

      if (files.length > slots) {
        errors.push(`Only ${slots} more image${slots === 1 ? "" : "s"} can be added (limit is 10).`);
      }

      for (const file of toProcess) {
        const err = validateFile(file);
        if (err) { errors.push(err); continue; }
        batch.push({
          stub: {
            localId: crypto.randomUUID(),
            key: null,
            url: null,
            name: file.name,
            sizeBytes: file.size,
            mimeType: file.type,
            status: "uploading",
          },
          file,
        });
      }

      if (batch.length > 0) {
        setImages((prev) => {
          const next = [...prev, ...batch.map((b) => b.stub)];
          persist(next);
          return next;
        });

        await Promise.all(
          batch.map(async ({ stub, file }) => {
            try {
              const { key, url } = await uploadImage(token, file);
              setImages((prev) => {
                const next = prev.map((i) =>
                  i.localId === stub.localId
                    ? { ...i, key, url, status: "done" as const }
                    : i,
                );
                persist(next);
                return next;
              });
            } catch (err) {
              setImages((prev) =>
                prev.map((i) =>
                  i.localId === stub.localId
                    ? {
                        ...i,
                        status: "error" as const,
                        errorMsg: err instanceof Error ? err.message : "Upload failed",
                      }
                    : i,
                ),
              );
            }
          }),
        );
      }

      return errors;
    },
    [token],
  );

  /**
   * Remove a single image by localId.
   * Fires a delete request to R2 if the image was successfully uploaded.
   */
  const removeImage = useCallback(
    (localId: string) => {
      const img = imagesRef.current.find((i) => i.localId === localId);
      setImages((prev) => {
        const next = prev.filter((i) => i.localId !== localId);
        persist(next);
        return next;
      });
      // Best-effort cleanup — not awaited
      if (img?.key) {
        deleteUploadedImage(token, img.key).catch(() => { /* orphan cleanup handles stragglers */ });
      }
    },
    [token],
  );

  /** Call after a successful send to reset composer state. */
  const clearAll = useCallback(() => {
    setImages([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  return { images, readyUrls, readyKeys, addFiles, removeImage, clearAll };
}
