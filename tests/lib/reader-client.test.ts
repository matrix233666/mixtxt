import { describe, expect, it } from "vitest";
import { defaultReaderPreferences } from "../../src/lib/reading";
import {
  applyReaderPreferencesToTargets,
  filterAndSortBooks,
  getDirectoryStateForViewport,
  parseBookTags,
  readEmbeddedJson,
  resolveBookContinueReadingTarget,
  resolveHomeContinueReadingItems,
  sanitizeBooksSortMode,
  sanitizeContinueReadingBooks,
  sanitizeContinueReadingPayload
} from "../../src/lib/reader-client";

/**
 * Creates a minimal browser-like storage mock for client-helper tests.
 */
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

/**
 * Creates a dataset carrier compatible with the shared preference helpers.
 */
function createPreferenceTarget() {
  return {
    dataset: {}
  };
}

describe("reader client helpers", () => {
  it("reads embedded JSON safely", () => {
    expect(readEmbeddedJson('{"ok":true}')).toEqual({ ok: true });
    expect(readEmbeddedJson("{", [])).toEqual([]);
    expect(readEmbeddedJson(undefined, null)).toBeNull();
  });

  it("sanitizes the homepage continue-reading payload", () => {
    const books = sanitizeContinueReadingBooks([
      {
        slug: "sanguo-scifi",
        title: "三国演义：星火纪元",
        chapters: [
          { slug: "prologue", title: "楔子", url: "/books/sanguo-scifi/prologue/" },
          { slug: "broken" }
        ]
      },
      {
        slug: 1,
        title: "invalid"
      }
    ]);

    expect(books).toEqual([
      {
        slug: "sanguo-scifi",
        title: "三国演义：星火纪元",
        chapters: [{ slug: "prologue", title: "楔子", url: "/books/sanguo-scifi/prologue/" }]
      }
    ]);
  });

  it("resolves the book-page continue-reading target only for valid public progress", () => {
    const payload = sanitizeContinueReadingPayload({
      bookSlug: "sanguo-scifi",
      chapters: [
        { slug: "prologue", title: "楔子", url: "/books/sanguo-scifi/prologue/" },
        { slug: "huangjin", title: "黄巾初起", url: "/books/sanguo-scifi/huangjin/" }
      ]
    });
    const validStorage = createStorageMock({
      "mixtxt.reader.lastChapter.sanguo-scifi": "sanguo-scifi/huangjin"
    });
    const staleStorage = createStorageMock({
      "mixtxt.reader.lastChapter.sanguo-scifi": "sanguo-scifi/hidden"
    });

    expect(resolveBookContinueReadingTarget(validStorage, payload)).toEqual({
      slug: "huangjin",
      title: "黄巾初起",
      url: "/books/sanguo-scifi/huangjin/"
    });
    expect(resolveBookContinueReadingTarget(staleStorage, payload)).toBeNull();
  });

  it("resolves homepage continue-reading items and drops stale progress", () => {
    const books = sanitizeContinueReadingBooks([
      {
        slug: "sanguo-scifi",
        title: "三国演义：星火纪元",
        chapters: [
          { slug: "prologue", title: "楔子", url: "/books/sanguo-scifi/prologue/" },
          { slug: "huangjin", title: "黄巾初起", url: "/books/sanguo-scifi/huangjin/" }
        ]
      },
      {
        slug: "hidden-book",
        title: "未公开作品",
        chapters: [{ slug: "visible", title: "公开章", url: "/books/hidden-book/visible/" }]
      }
    ]);
    const storage = createStorageMock({
      "mixtxt.reader.lastChapter.sanguo-scifi": "sanguo-scifi/prologue",
      "mixtxt.reader.lastChapter.hidden-book": "hidden-book/missing"
    });

    expect(resolveHomeContinueReadingItems(storage, books)).toEqual([
      {
        slug: "prologue",
        title: "楔子",
        url: "/books/sanguo-scifi/prologue/",
        bookTitle: "三国演义：星火纪元"
      }
    ]);
  });

  it("applies reader preferences to every target consistently", () => {
    const htmlTarget = createPreferenceTarget();
    const rootTarget = createPreferenceTarget();

    applyReaderPreferencesToTargets(
      {
        ...defaultReaderPreferences,
        theme: "dark",
        fontSize: "large",
        lineHeight: "relaxed",
        width: "wide"
      },
      htmlTarget,
      rootTarget
    );

    expect(htmlTarget.dataset).toEqual({
      readerTheme: "dark",
      readerFontSize: "large",
      readerLineHeight: "relaxed",
      readerWidth: "wide"
    });
    expect(rootTarget.dataset).toEqual(htmlTarget.dataset);
  });

  it("derives the expected directory state from the viewport", () => {
    expect(getDirectoryStateForViewport(true)).toEqual({
      open: true,
      expanded: "true"
    });
    expect(getDirectoryStateForViewport(false)).toEqual({
      open: false,
      expanded: "false"
    });
  });

  it("parses serialized book tags safely", () => {
    expect(parseBookTags('["科幻","历史"]')).toEqual(["科幻", "历史"]);
    expect(parseBookTags("not-json")).toEqual([]);
    expect(parseBookTags(undefined)).toEqual([]);
  });

  it("filters and sorts books according to the active controls", () => {
    const cards = [
      {
        element: null,
        title: "三国演义：星火纪元",
        status: "serializing",
        updatedAt: "2026-06-05",
        tags: ["科幻", "历史"]
      },
      {
        element: null,
        title: "水浒外传",
        status: "completed",
        updatedAt: "2026-06-03",
        tags: ["武侠"]
      },
      {
        element: null,
        title: "红楼异闻",
        status: "planning",
        updatedAt: "2026-06-04",
        tags: ["悬疑", "历史"]
      }
    ];

    expect(
      filterAndSortBooks(cards, {
        status: "all",
        tag: "历史",
        sort: sanitizeBooksSortMode("title")
      }).map((card) => card.title)
    ).toEqual(["红楼异闻", "三国演义：星火纪元"]);

    expect(
      filterAndSortBooks(cards, {
        status: "all",
        tag: "all",
        sort: sanitizeBooksSortMode("completion")
      }).map((card) => card.title)
    ).toEqual(["水浒外传", "三国演义：星火纪元", "红楼异闻"]);

    expect(
      filterAndSortBooks(cards, {
        status: "all",
        tag: "all",
        sort: sanitizeBooksSortMode("unknown")
      }).map((card) => card.title)
    ).toEqual(["三国演义：星火纪元", "红楼异闻", "水浒外传"]);
  });
});
