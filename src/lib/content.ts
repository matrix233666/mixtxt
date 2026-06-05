import { getCollection } from "astro:content";

type Visibility = "public" | "hidden";
type ChapterStatus = "draft" | "review" | "published" | "archived";

export type BookEntryLike = {
  id: string;
  data: {
    slug: string;
    visibility: Visibility;
    updatedAt: string;
    tags?: string[];
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

export function filterPublicBooks<T extends BookEntryLike>(books: readonly T[]) {
  return [...books]
    .filter((book) => book.data.visibility === "public")
    .sort((a, b) => b.data.updatedAt.localeCompare(a.data.updatedAt));
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
  const publicBookSlugs = new Set(
    (books ? filterPublicBooks(books) : []).map((book) => book.data.slug)
  );

  return [...chapters]
    .filter((chapter) => chapter.data.status === "published")
    .filter((chapter) => (books ? publicBookSlugs.has(chapter.data.book) : true))
    .filter((chapter) => (bookSlug ? chapter.data.book === bookSlug : true))
    .sort((a, b) => a.data.chapterNo.localeCompare(b.data.chapterNo));
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
  return [...chapters]
    .sort((a, b) => b.data.updatedAt.localeCompare(a.data.updatedAt))
    .slice(0, limit);
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
  return [...new Set(books.flatMap((book) => book.data.tags ?? []))].sort((a, b) =>
    a.localeCompare(b)
  );
}
