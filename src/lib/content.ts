import { getCollection } from "astro:content";

type Visibility = "public" | "hidden";
type ChapterStatus = "draft" | "review" | "published" | "archived";

export type BookEntryLike = {
  id: string;
  data: {
    slug: string;
    title?: string;
    status?: "planning" | "serializing" | "completed" | "paused";
    visibility: Visibility;
    updatedAt: string;
    copyrightStatus?: "public-domain" | "authorized" | "private-draft" | "unknown";
    tags?: readonly string[];
  };
};

export type ChapterEntryLike = {
  id: string;
  data: {
    book: string;
    chapterNo: string;
    title?: string;
    slug: string;
    status: ChapterStatus;
    summary?: string;
    wordCount?: number;
    updatedAt: string;
  };
};

export type ReleaseEntryLike = {
  id: string;
  body?: string;
  data: {
    book: string;
    version: string;
    versionSlug: string;
    title: string;
    date: string;
    gitTag?: string;
  };
};

function compareDescByDate(left: string, right: string) {
  return right.localeCompare(left);
}

/**
 * Returns the set of public book slugs used to guard chapter and release visibility.
 */
function getPublicBookSlugSet<T extends BookEntryLike>(books: readonly T[]) {
  return new Set(filterPublicBooks(books).map((book) => book.data.slug));
}

/**
 * Collects a stable, de-duplicated tag list for public browsing routes.
 */
function getSortedUniqueTags<T extends BookEntryLike>(books: readonly T[]) {
  return [...new Set(books.flatMap((book) => book.data.tags ?? []))].sort((a, b) =>
    a.localeCompare(b)
  );
}

/**
 * Filters the books collection down to public entries in recency order.
 */
export function filterPublicBooks<T extends BookEntryLike>(books: readonly T[]) {
  return [...books]
    .filter((book) => book.data.visibility === "public")
    .sort((a, b) => compareDescByDate(a.data.updatedAt, b.data.updatedAt));
}

/**
 * Finds a public book by slug using the same visibility rules as public pages.
 */
export function findPublicBookBySlug<T extends BookEntryLike>(
  books: readonly T[],
  slug: string
) {
  return filterPublicBooks(books).find((book) => book.data.slug === slug);
}

/**
 * Filters chapters down to published entries that still belong to public books.
 */
export function filterPublishedChapters<T extends ChapterEntryLike>(
  chapters: readonly T[],
  books?: readonly BookEntryLike[],
  bookSlug?: string
) {
  const publicBookSlugs = books ? getPublicBookSlugSet(books) : null;

  return [...chapters]
    .filter((chapter) => chapter.data.status === "published")
    .filter((chapter) => (publicBookSlugs ? publicBookSlugs.has(chapter.data.book) : true))
    .filter((chapter) => (bookSlug ? chapter.data.book === bookSlug : true))
    .sort(
      (a, b) =>
        a.data.chapterNo.localeCompare(b.data.chapterNo) ||
        a.data.book.localeCompare(b.data.book) ||
        a.data.slug.localeCompare(b.data.slug)
    );
}

/**
 * Builds previous/current/next chapter pointers for a public chapter route.
 */
export function buildChapterNav<T extends ChapterEntryLike>(
  chapters: readonly T[],
  books: readonly BookEntryLike[],
  bookSlug: string,
  chapterSlug: string
) {
  const bookChapters = filterPublishedChapters(chapters, books, bookSlug);
  const index = bookChapters.findIndex((chapter) => chapter.data.slug === chapterSlug);

  return {
    chapters: bookChapters,
    current: index >= 0 ? bookChapters[index] : null,
    prev: index > 0 ? bookChapters[index - 1] : null,
    next: index >= 0 && index < bookChapters.length - 1 ? bookChapters[index + 1] : null
  };
}

/**
 * Returns every public book in reverse updated order.
 */
export async function getPublicBooks() {
  const books = await getCollection("books");
  return filterPublicBooks(books);
}

/**
 * Returns a single public book by slug or null when it is hidden or missing.
 */
export async function getBookBySlug(slug: string) {
  const books = await getCollection("books");
  return findPublicBookBySlug(books, slug) ?? null;
}

/**
 * Returns all published chapters, optionally scoped to a single public book.
 */
export async function getPublishedChapters(bookSlug?: string) {
  const [books, chapters] = await Promise.all([
    getCollection("books"),
    getCollection("chapters")
  ]);

  return filterPublishedChapters(chapters, books, bookSlug);
}

/**
 * Returns the first public chapter that should act as the reading start point.
 */
export async function getBookStartChapter(bookSlug: string) {
  const chapters = await getPublishedChapters(bookSlug);
  return chapters[0] ?? null;
}

/**
 * Returns a single public chapter by its book and chapter slug pair.
 */
export async function getPublicChapterBySlug(bookSlug: string, chapterSlug: string) {
  const chapters = await getPublishedChapters(bookSlug);
  return chapters.find((chapter) => chapter.data.slug === chapterSlug) ?? null;
}

/**
 * Returns recent public chapters for homepage-style update lists.
 */
export async function getRecentChapters(limit = 10) {
  const chapters = await getPublishedChapters();
  const normalizedLimit = Math.max(0, limit);

  return [...chapters]
    .sort((a, b) => compareDescByDate(a.data.updatedAt, b.data.updatedAt))
    .slice(0, normalizedLimit);
}

/**
 * Returns previous/current/next navigation for a public chapter route.
 */
export async function getChapterNav(bookSlug: string, chapterSlug: string) {
  const [books, chapters] = await Promise.all([
    getCollection("books"),
    getCollection("chapters")
  ]);

  return buildChapterNav(chapters, books, bookSlug, chapterSlug);
}

/**
 * Returns all unique tags used by public books.
 */
export async function getAllTags() {
  const books = await getPublicBooks();
  return getSortedUniqueTags(books);
}

/**
 * Returns all public books that carry the provided tag.
 */
export async function getPublicBooksByTag(tag: string) {
  const books = await getPublicBooks();
  return books.filter((book) => (book.data.tags ?? []).includes(tag));
}

/**
 * Backwards-compatible alias for existing tag pages.
 */
export async function getBooksByTag(tag: string) {
  return getPublicBooksByTag(tag);
}

/**
 * Returns every public release, newest first.
 */
export async function getPublicReleases() {
  const [books, releases] = await Promise.all([
    getCollection("books"),
    getCollection("releases")
  ]);
  const publicBookSlugs = getPublicBookSlugSet(books);

  return [...releases]
    .filter((release) => publicBookSlugs.has(release.data.book))
    .sort(
      (a, b) =>
        compareDescByDate(a.data.date, b.data.date) ||
        a.data.book.localeCompare(b.data.book) ||
        a.data.version.localeCompare(b.data.version)
    );
}

/**
 * Returns public releases scoped to a single public book.
 */
export async function getPublicReleasesByBook(bookSlug: string) {
  const releases = await getPublicReleases();
  return releases.filter((release) => release.data.book === bookSlug);
}

/**
 * Returns recent updates for public homepage and feeds.
 */
export async function getRecentPublicUpdates(limit = 10) {
  const chapters = await getPublishedChapters();
  const normalizedLimit = Math.max(0, limit);

  return [...chapters]
    .sort((a, b) => compareDescByDate(a.data.updatedAt, b.data.updatedAt))
    .slice(0, normalizedLimit)
    .map((chapter) => ({
      kind: "chapter" as const,
      chapter
    }));
}

/**
 * Returns the fully public URLs that must appear in the generated sitemap.
 */
export async function getPublicSitemapEntries() {
  const [books, chapters, tags] = await Promise.all([
    getPublicBooks(),
    getPublishedChapters(),
    getAllTags()
  ]);

  return [
    "/",
    "/books/",
    ...books.map((book) => `/books/${book.data.slug}/`),
    ...chapters.map((chapter) => `/books/${chapter.data.book}/${chapter.data.slug}/`),
    "/about/",
    "/releases/",
    "/search/",
    ...tags.map((tag) => `/tags/${encodeURIComponent(tag)}/`)
  ];
}
