import { describe, expect, it } from "vitest";
import {
  defaultReaderPreferences,
  formatReaderProgress,
  getLastChapterStorageKey,
  mergeReaderPreferences,
  readStoredReaderPreferences,
  readStoredReaderProgress,
  resolveProgressChapter,
  sanitizeReaderPreferences,
  sanitizeReaderProgress,
  writeStoredReaderPreference,
  writeStoredReaderProgress
} from "../../src/lib/reading";

function createStorageMock(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    }
  };
}

describe("reader preferences", () => {
  it("provides stable defaults", () => {
    expect(defaultReaderPreferences.theme).toBe("system");
    expect(defaultReaderPreferences.fontSize).toBe("medium");
    expect(defaultReaderPreferences.lineHeight).toBe("standard");
    expect(defaultReaderPreferences.width).toBe("standard");
  });

  it("sanitizes invalid persisted values", () => {
    expect(
      sanitizeReaderPreferences({
        theme: "neon" as never,
        fontSize: "huge" as never,
        lineHeight: "loose" as never,
        width: "cinema" as never
      })
    ).toEqual(defaultReaderPreferences);
  });

  it("merges a partial user override", () => {
    expect(mergeReaderPreferences({ fontSize: "large" }).fontSize).toBe("large");
    expect(mergeReaderPreferences({ fontSize: "large" }).theme).toBe("system");
  });

  it("builds a stable last-chapter storage key", () => {
    expect(getLastChapterStorageKey("sanguo-scifi")).toBe("mixtxt.reader.lastChapter.sanguo-scifi");
  });

  it("formats and sanitizes reader progress", () => {
    const progress = formatReaderProgress({
      bookSlug: "sanguo-scifi",
      chapterSlug: "huangjin"
    });

    expect(progress).toBe("sanguo-scifi/huangjin");
    expect(sanitizeReaderProgress("sanguo-scifi", progress)).toEqual({
      bookSlug: "sanguo-scifi",
      chapterSlug: "huangjin"
    });
  });

  it("drops invalid or stale reader progress values", () => {
    expect(sanitizeReaderProgress("sanguo-scifi", "other-book/huangjin")).toBeNull();
    expect(sanitizeReaderProgress("sanguo-scifi", "sanguo-scifi/not valid")).toBeNull();
    expect(sanitizeReaderProgress("sanguo-scifi", "")).toBeNull();
  });

  it("reads stored reader preferences through the shared helper", () => {
    const storage = createStorageMock({
      "mixtxt.reader.theme": "dark",
      "mixtxt.reader.fontSize": "large",
      "mixtxt.reader.lineHeight": "relaxed",
      "mixtxt.reader.width": "wide"
    });

    expect(readStoredReaderPreferences(storage)).toEqual({
      theme: "dark",
      fontSize: "large",
      lineHeight: "relaxed",
      width: "wide"
    });
  });

  it("writes a single preference through the shared helper", () => {
    const storage = createStorageMock();

    const nextPreferences = writeStoredReaderPreference(storage, "theme", "dark");

    expect(nextPreferences.theme).toBe("dark");
    expect(storage.getItem("mixtxt.reader.theme")).toBe("dark");
  });

  it("reads, writes, and resolves continue-reading progress through shared helpers", () => {
    const storage = createStorageMock();

    writeStoredReaderProgress(storage, {
      bookSlug: "sanguo-scifi",
      chapterSlug: "huangjin"
    });

    const progress = readStoredReaderProgress(storage, "sanguo-scifi");
    const chapter = resolveProgressChapter(
      [
        { slug: "prologue", title: "楔子" },
        { slug: "huangjin", title: "黄巾初起" }
      ],
      progress
    );

    expect(progress).toEqual({
      bookSlug: "sanguo-scifi",
      chapterSlug: "huangjin"
    });
    expect(chapter).toEqual({ slug: "huangjin", title: "黄巾初起" });
  });
});
