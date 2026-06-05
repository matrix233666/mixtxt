import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("astro:content", () => ({
  getCollection: vi.fn()
}));

let buildChapterNav: typeof import("../../src/lib/content").buildChapterNav;
let filterPublicBooks: typeof import("../../src/lib/content").filterPublicBooks;
let filterPublishedChapters: typeof import("../../src/lib/content").filterPublishedChapters;
let findPublicBookBySlug: typeof import("../../src/lib/content").findPublicBookBySlug;

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

beforeAll(async () => {
  ({
    buildChapterNav,
    filterPublicBooks,
    filterPublishedChapters,
    findPublicBookBySlug
  } = await import("../../src/lib/content"));
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
});
