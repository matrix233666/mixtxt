import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { getCollectionMock } = vi.hoisted(() => ({
  getCollectionMock: vi.fn()
}));

vi.mock("astro:content", () => ({
  getCollection: getCollectionMock
}));

let buildChapterNav: typeof import("../../src/lib/content").buildChapterNav;
let filterPublicBooks: typeof import("../../src/lib/content").filterPublicBooks;
let filterPublishedChapters: typeof import("../../src/lib/content").filterPublishedChapters;
let findPublicBookBySlug: typeof import("../../src/lib/content").findPublicBookBySlug;
let getAllTags: typeof import("../../src/lib/content").getAllTags;
let getBookBySlug: typeof import("../../src/lib/content").getBookBySlug;
let getBookStartChapter: typeof import("../../src/lib/content").getBookStartChapter;
let getChapterNav: typeof import("../../src/lib/content").getChapterNav;
let getPublicBooksByTag: typeof import("../../src/lib/content").getPublicBooksByTag;
let getPublicBooks: typeof import("../../src/lib/content").getPublicBooks;
let getPublicChapterBySlug: typeof import("../../src/lib/content").getPublicChapterBySlug;
let getPublicReleasesByBook: typeof import("../../src/lib/content").getPublicReleasesByBook;
let getPublicSitemapEntries: typeof import("../../src/lib/content").getPublicSitemapEntries;
let getPublishedChapters: typeof import("../../src/lib/content").getPublishedChapters;
let getPublicReleases: typeof import("../../src/lib/content").getPublicReleases;
let getRecentChapters: typeof import("../../src/lib/content").getRecentChapters;

const books = [
  {
    id: "books/public.json",
    data: {
      slug: "public-book",
      visibility: "public",
      updatedAt: "2026-06-04",
      tags: ["A"]
    }
  },
  {
    id: "books/hidden.json",
    data: {
      slug: "hidden-book",
      visibility: "hidden",
      updatedAt: "2026-06-05",
      tags: ["B"]
    }
  }
] as const;

const chapters = [
  {
    id: "chapters/public-001.md",
    data: {
      book: "public-book",
      chapterNo: "001",
      slug: "one",
      status: "published",
      updatedAt: "2026-06-03"
    }
  },
  {
    id: "chapters/public-002.md",
    data: {
      book: "public-book",
      chapterNo: "002",
      slug: "two",
      status: "published",
      updatedAt: "2026-06-04"
    }
  },
  {
    id: "chapters/public-003.md",
    data: {
      book: "public-book",
      chapterNo: "003",
      slug: "draft",
      status: "draft",
      updatedAt: "2026-06-05"
    }
  },
  {
    id: "chapters/hidden-001.md",
    data: {
      book: "hidden-book",
      chapterNo: "001",
      slug: "hidden",
      status: "published",
      updatedAt: "2026-06-05"
    }
  }
] as const;

const releases = [
  {
    id: "releases/public-v0-1-0.md",
    data: {
      book: "public-book",
      version: "v0.1.0",
      versionSlug: "v0-1-0",
      title: "首发",
      date: "2026-06-05"
    }
  },
  {
    id: "releases/hidden-v0-1-0.md",
    data: {
      book: "hidden-book",
      version: "v0.1.0",
      versionSlug: "v0-1-0",
      title: "隐藏首发",
      date: "2026-06-06"
    }
  }
] as const;

beforeAll(async () => {
  ({
    buildChapterNav,
    filterPublicBooks,
    filterPublishedChapters,
    findPublicBookBySlug,
    getAllTags,
    getBookBySlug,
    getBookStartChapter,
    getChapterNav,
    getPublicBooksByTag,
    getPublicBooks,
    getPublicChapterBySlug,
    getPublicReleases,
    getPublicReleasesByBook,
    getPublicSitemapEntries,
    getPublishedChapters,
    getRecentChapters
  } = await import("../../src/lib/content"));
});

beforeEach(() => {
  getCollectionMock.mockReset();
});

describe("content query helpers", () => {
  it("keeps only public books sorted by updatedAt descending", () => {
    expect(filterPublicBooks(books).map((book) => book.data.slug)).toEqual(["public-book"]);
  });

  it("finds a public book by slug", () => {
    expect(findPublicBookBySlug(books, "public-book")?.id).toBe("books/public.json");
    expect(findPublicBookBySlug(books, "hidden-book")).toBeUndefined();
  });

  it("keeps only published chapters under public books", () => {
    expect(
      filterPublishedChapters(chapters, books).map(
        (chapter) => `${chapter.data.book}:${chapter.data.slug}`
      )
    ).toEqual(["public-book:one", "public-book:two"]);
  });

  it("builds previous and next chapter links inside a book", () => {
    const nav = buildChapterNav(chapters, books, "public-book", "two");

    expect(nav.current?.data.slug).toBe("two");
    expect(nav.prev?.data.slug).toBe("one");
    expect(nav.next).toBeNull();
  });

  it("uses a deterministic secondary sort when chapter numbers match", () => {
    const publicBooks = [
      ...books,
      {
        id: "books/another-public.json",
        data: {
          slug: "another-public",
          visibility: "public" as const,
          updatedAt: "2026-06-02",
          tags: ["C"]
        }
      }
    ] as const;
    const sameNumberChapters = [
      chapters[0],
      {
        id: "chapters/another-public-001.md",
        data: {
          book: "another-public",
          chapterNo: "001",
          slug: "alpha",
          status: "published" as const,
          updatedAt: "2026-06-02"
        }
      }
    ] as const;

    expect(
      filterPublishedChapters(sameNumberChapters, publicBooks).map(
        (chapter) => `${chapter.data.book}:${chapter.data.slug}`
      )
    ).toEqual(["another-public:alpha", "public-book:one"]);
  });

  it("gets only public books from the books collection", async () => {
    getCollectionMock.mockResolvedValueOnce(books);

    expect(await getPublicBooks()).toEqual([books[0]]);
    expect(getCollectionMock).toHaveBeenCalledWith("books");
  });

  it("gets a public book by slug and returns null for hidden books", async () => {
    getCollectionMock.mockResolvedValueOnce(books);
    expect(await getBookBySlug("public-book")).toEqual(books[0]);

    getCollectionMock.mockResolvedValueOnce(books);
    expect(await getBookBySlug("hidden-book")).toBeNull();
  });

  it("gets published chapters scoped to public books and an optional book slug", async () => {
    getCollectionMock.mockImplementation(async (collection: string) => {
      if (collection === "books") return books;
      if (collection === "chapters") return chapters;
      return [];
    });

    expect(
      (await getPublishedChapters()).map((chapter) => `${chapter.data.book}:${chapter.data.slug}`)
    ).toEqual(["public-book:one", "public-book:two"]);

    expect(
      (await getPublishedChapters("public-book")).map((chapter) => chapter.data.slug)
    ).toEqual(["one", "two"]);
  });

  it("gets the start chapter and a public chapter by slug", async () => {
    getCollectionMock.mockImplementation(async (collection: string) => {
      if (collection === "books") return books;
      if (collection === "chapters") return chapters;
      return [];
    });

    expect((await getBookStartChapter("public-book"))?.data.slug).toBe("one");
    expect((await getPublicChapterBySlug("public-book", "two"))?.data.slug).toBe("two");
    expect(await getPublicChapterBySlug("public-book", "draft")).toBeNull();
  });

  it("gets recent chapters in updatedAt order and clamps negative limits", async () => {
    const manyChapters = [
      ...chapters,
      {
        id: "chapters/public-004.md",
        data: {
          book: "public-book",
          chapterNo: "004",
          slug: "four",
          status: "published" as const,
          updatedAt: "2026-06-06"
        }
      },
      {
        id: "chapters/public-005.md",
        data: {
          book: "public-book",
          chapterNo: "005",
          slug: "five",
          status: "published" as const,
          updatedAt: "2026-06-07"
        }
      }
    ] as const;

    getCollectionMock.mockImplementation(async (collection: string) => {
      if (collection === "books") return books;
      if (collection === "chapters") return manyChapters;
      return [];
    });

    expect((await getRecentChapters(1)).map((chapter) => chapter.data.slug)).toEqual(["five"]);
    expect(await getRecentChapters(-3)).toEqual([]);
  });

  it("gets chapter navigation for a published public chapter", async () => {
    getCollectionMock.mockImplementation(async (collection: string) => {
      if (collection === "books") return books;
      if (collection === "chapters") return chapters;
      return [];
    });

    const nav = await getChapterNav("public-book", "two");

    expect(nav.current?.data.slug).toBe("two");
    expect(nav.prev?.data.slug).toBe("one");
    expect(nav.next).toBeNull();
  });

  it("gets unique sorted tags from public books only", async () => {
    const taggedBooks = [
      books[0],
      {
        id: "books/second-public.json",
        data: {
          slug: "second-public",
          visibility: "public" as const,
          updatedAt: "2026-06-01",
          tags: ["B", "A"]
        }
      },
      books[1]
    ] as const;

    getCollectionMock.mockResolvedValueOnce(taggedBooks);

    expect(await getAllTags()).toEqual(["A", "B"]);
  });

  it("gets public books by tag", async () => {
    getCollectionMock.mockResolvedValueOnce(books);
    expect((await getPublicBooksByTag("A")).map((book) => book.data.slug)).toEqual(["public-book"]);
  });

  it("filters releases down to public books and per-book subsets", async () => {
    getCollectionMock.mockImplementation(async (collection: string) => {
      if (collection === "books") return books;
      if (collection === "releases") return releases;
      return [];
    });

    expect((await getPublicReleases()).map((release) => release.data.book)).toEqual(["public-book"]);
    expect((await getPublicReleasesByBook("public-book")).map((release) => release.data.title)).toEqual([
      "首发"
    ]);
  });

  it("includes the books and about routes in the public sitemap", async () => {
    getCollectionMock.mockImplementation(async (collection: string) => {
      if (collection === "books") return books;
      if (collection === "chapters") return chapters;
      return [];
    });

    expect(await getPublicSitemapEntries()).toContain("/books/");
    expect(await getPublicSitemapEntries()).toContain("/about/");
  });
});
