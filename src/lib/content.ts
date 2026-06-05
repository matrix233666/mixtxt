import { getCollection } from "astro:content";

type Visibility = "public" | "hidden";
type ChapterStatus = "draft" | "review" | "published" | "archived";

export type BookEntryLike = {
  id: string;
  data: {
    slug: string;
    visibility: Visibility;
    updatedAt: string;
    tags?: readonly string[];
  };
};

export type ChapterEntryLike = {
  id: string;
  data: {
    book: string;
    chapterNo: string;
    slug: string;
    status: ChapterStatus;
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

function getPublicBookSlugSet<T extends BookEntryLike>(books: readonly T[]) {
  return new Set(filterPublicBooks(books).map((book) => book.data.slug));
}

function getSortedUniqueTags<T extends BookEntryLike>(books: readonly T[]) {
  return [...new Set(books.flatMap((book) => book.data.tags ?? []))].sort((a, b) =>
    a.localeCompare(b)
  );
}

export function filterPublicBooks<T extends BookEntryLike>(books: readonly T[]) {
  return [...books]
    .filter((book) => book.data.visibility === "public")
    .sort((a, b) => compareDescByDate(a.data.updatedAt, b.data.updatedAt));
}

export function findPublicBookBySlug<T extends BookEntryLike>(
  books: readonly T[],
  slug: string
) {
  return filterPublicBooks(books).find((book) => book.data.slug === slug);
}

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

export async function getPublicBooks() {
  const books = await getCollection("books");
  return filterPublicBooks(books);
}

export async function getBookBySlug(slug: string) {
  const books = await getCollection("books");
  return findPublicBookBySlug(books, slug) ?? null;
}

export async function getPublishedChapters(bookSlug?: string) {
  const [books, chapters] = await Promise.all([
    getCollection("books"),
    getCollection("chapters")
  ]);

  return filterPublishedChapters(chapters, books, bookSlug);
}

export async function getRecentChapters(limit = 10) {
  const chapters = await getPublishedChapters();
  const normalizedLimit = Math.max(0, limit);

  return [...chapters]
    .sort((a, b) => compareDescByDate(a.data.updatedAt, b.data.updatedAt))
    .slice(0, normalizedLimit);
}

export async function getChapterNav(bookSlug: string, chapterSlug: string) {
  const [books, chapters] = await Promise.all([
    getCollection("books"),
    getCollection("chapters")
  ]);

  return buildChapterNav(chapters, books, bookSlug, chapterSlug);
}

export async function getAllTags() {
  const books = await getPublicBooks();
  return getSortedUniqueTags(books);
}

export async function getBooksByTag(tag: string) {
  const books = await getPublicBooks();
  return books.filter((book) => (book.data.tags ?? []).includes(tag));
}

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

export async function getPublicSitemapEntries() {
  const [books, chapters, tags] = await Promise.all([
    getPublicBooks(),
    getPublishedChapters(),
    getAllTags()
  ]);

  return [
    "/",
    ...books.map((book) => `/books/${book.data.slug}/`),
    ...chapters.map((chapter) => `/books/${chapter.data.book}/${chapter.data.slug}/`),
    "/releases/",
    "/search/",
    ...tags.map((tag) => `/tags/${encodeURIComponent(tag)}/`)
  ];
}
