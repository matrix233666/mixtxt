import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReleaseEntryLike } from "../../src/lib/content";

vi.mock("astro:content", () => ({
  getCollection: vi.fn()
}));

import { getCollection } from "astro:content";
import {
  filterPublicBooks,
  getBooksByTag,
  getPublicReleases,
  getPublicSitemapEntries,
  getRecentPublicUpdates
} from "../../src/lib/content";

const books = [
  {
    id: "books/public-book.json",
    collection: "books",
    data: {
      slug: "public-book",
      title: "Public Book",
      visibility: "public",
      updatedAt: "2026-06-05",
      tags: ["科幻", "AI改编"]
    }
  },
  {
    id: "books/hidden-book.json",
    collection: "books",
    data: {
      slug: "hidden-book",
      title: "Hidden Book",
      visibility: "hidden",
      updatedAt: "2026-06-06",
      tags: ["隐藏"]
    }
  }
] as const;

const chapters = [
  {
    id: "chapters/public-book-001.md",
    collection: "chapters",
    data: {
      book: "public-book",
      chapterNo: "001",
      slug: "start",
      title: "Start",
      summary: "Opening chapter",
      status: "published",
      updatedAt: "2026-06-05"
    }
  },
  {
    id: "chapters/public-book-002.md",
    collection: "chapters",
    data: {
      book: "public-book",
      chapterNo: "002",
      slug: "signal",
      title: "Signal",
      summary: "Second chapter",
      status: "published",
      updatedAt: "2026-06-06"
    }
  },
  {
    id: "chapters/hidden-book-001.md",
    collection: "chapters",
    data: {
      book: "hidden-book",
      chapterNo: "001",
      slug: "secret",
      title: "Secret",
      summary: "Should not surface",
      status: "published",
      updatedAt: "2026-06-07"
    }
  }
] as const;

const releaseWithoutGitTag: ReleaseEntryLike = {
  id: "releases/public-book-v0-2-0.md",
  body: "Release without git tag",
  data: {
    book: "public-book",
    version: "v0.2.0",
    versionSlug: "v0-2-0",
    title: "No Tag Release",
    date: "2026-06-08"
  }
};

const releases = [
  {
    id: "releases/public-book-v0-1-0.md",
    collection: "releases",
    body: "Public release body",
    data: {
      book: "public-book",
      version: "v0.1.0",
      versionSlug: "v0-1-0",
      title: "Public Release",
      date: "2026-06-06",
      gitTag: "v0.1.0"
    }
  },
  {
    ...releaseWithoutGitTag,
    collection: "releases"
  },
  {
    id: "releases/hidden-book-v0-1-0.md",
    collection: "releases",
    body: "Hidden release body",
    data: {
      book: "hidden-book",
      version: "v0.1.0",
      versionSlug: "v0-1-0",
      title: "Hidden Release",
      date: "2026-06-07",
      gitTag: "hidden-v0.1.0"
    }
  }
] as const;

const mockedGetCollection = vi.mocked(getCollection);

beforeEach(() => {
  mockedGetCollection.mockReset();
  mockedGetCollection.mockImplementation(async (name: string) => {
    if (name === "books") return books as never;
    if (name === "chapters") return chapters as never;
    if (name === "releases") return releases as never;
    throw new Error(`Unexpected collection ${name}`);
  });
});

describe("discovery content helpers", () => {
  it("returns only public books for a tag", async () => {
    await expect(getBooksByTag("科幻")).resolves.toMatchObject([
      { data: { slug: "public-book" } }
    ]);
    await expect(getBooksByTag("隐藏")).resolves.toEqual([]);
  });

  it("returns only releases for public books sorted by date desc", async () => {
    const publicReleases = await getPublicReleases();

    expect(publicReleases.map((release) => release.id)).toEqual([
      "releases/public-book-v0-2-0.md",
      "releases/public-book-v0-1-0.md"
    ]);
    expect(publicReleases[0]).toMatchObject({
      id: "releases/public-book-v0-2-0.md",
      body: "Release without git tag",
      data: {
        book: "public-book",
        title: "No Tag Release"
      }
    });
    expect(publicReleases[0].data).not.toHaveProperty("gitTag");
    expect(publicReleases[1]).toMatchObject({
      id: "releases/public-book-v0-1-0.md",
      data: {
        book: "public-book",
        title: "Public Release",
        gitTag: "v0.1.0"
      }
    });
  });

  it("returns recent public updates from published public chapters only", async () => {
    await expect(getRecentPublicUpdates(1)).resolves.toMatchObject([
      {
        kind: "chapter",
        chapter: { data: { slug: "signal" } }
      }
    ]);
  });

  it("returns sitemap entries without hidden-book routes", async () => {
    const entries = await getPublicSitemapEntries();

    expect(entries).toEqual([
      "/",
      "/books/",
      "/books/public-book/",
      "/books/public-book/start/",
      "/books/public-book/signal/",
      "/about/",
      "/releases/",
      "/search/",
      "/tags/%E7%A7%91%E5%B9%BB/",
      "/tags/AI%E6%94%B9%E7%BC%96/"
    ]);
    expect(entries.some((entry) => entry.includes("hidden-book"))).toBe(false);
  });

  it("still keeps public-book filtering behavior intact", () => {
    expect(filterPublicBooks(books).map((book) => book.data.slug)).toEqual(["public-book"]);
  });
});
