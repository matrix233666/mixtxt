import {
  defaultReaderPreferences,
  readStoredReaderPreferences,
  readStoredReaderProgress,
  readerPreferenceOptions,
  readerStorageKeys,
  resolveProgressChapter,
  type ReaderPreferences,
  type ReaderStorageLike
} from "./reading";

export type ContinueReadingChapter = {
  slug: string;
  title: string;
  url: string;
};

export type ContinueReadingBook = {
  slug: string;
  title: string;
  chapters: ContinueReadingChapter[];
};

export type ContinueReadingPayload = {
  bookSlug: string;
  chapters: ContinueReadingChapter[];
};

export type ContinueReadingItem = ContinueReadingChapter & {
  bookTitle: string;
};

export type ReaderPreferenceTarget = {
  dataset: Record<string, string | undefined>;
};

export type BooksSortMode = "recent" | "title" | "completion";

export type BooksFilterState = {
  status: string;
  tag: string;
  sort: BooksSortMode;
};

export type BooksCardRecord = {
  element: HTMLElement | null;
  title: string;
  status: string;
  updatedAt: string;
  tags: string[];
};

const completionRank: Record<string, number> = {
  completed: 0,
  serializing: 1,
  planning: 2,
  paused: 3
};

/**
 * Returns true when the input is a plain JSON-like object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Narrows an unknown payload into a normalized continue-reading chapter model.
 */
function sanitizeContinueReadingChapter(input: unknown): ContinueReadingChapter | null {
  if (!isRecord(input)) {
    return null;
  }

  const { slug, title, url } = input;
  if (typeof slug !== "string" || typeof title !== "string" || typeof url !== "string") {
    return null;
  }

  return { slug, title, url };
}

/**
 * Parses embedded JSON text and falls back safely when the payload is absent or invalid.
 */
export function readEmbeddedJson(text: string | null | undefined, fallback: unknown = null): unknown {
  if (typeof text !== "string") {
    return fallback;
  }

  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

/**
 * Normalizes the homepage continue-reading payload into a stable array shape.
 */
export function sanitizeContinueReadingBooks(input: unknown): ContinueReadingBook[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.slug !== "string" || typeof entry.title !== "string") {
      return [];
    }

    const chapters = Array.isArray(entry.chapters)
      ? entry.chapters.flatMap((chapter) => {
          const normalizedChapter = sanitizeContinueReadingChapter(chapter);
          return normalizedChapter ? [normalizedChapter] : [];
        })
      : [];

    return [
      {
        slug: entry.slug,
        title: entry.title,
        chapters
      }
    ];
  });
}

/**
 * Normalizes a single-book continue-reading payload for the book detail page.
 */
export function sanitizeContinueReadingPayload(input: unknown): ContinueReadingPayload | null {
  if (!isRecord(input) || typeof input.bookSlug !== "string" || !Array.isArray(input.chapters)) {
    return null;
  }

  const chapters = input.chapters.flatMap((chapter) => {
    const normalizedChapter = sanitizeContinueReadingChapter(chapter);
    return normalizedChapter ? [normalizedChapter] : [];
  });

  return {
    bookSlug: input.bookSlug,
    chapters
  };
}

/**
 * Resolves the current book's continue-reading target from public chapter data.
 */
export function resolveBookContinueReadingTarget(
  storage: ReaderStorageLike,
  payload: ContinueReadingPayload | null
) {
  if (!payload) {
    return null;
  }

  const progress = readStoredReaderProgress(storage, payload.bookSlug);
  return resolveProgressChapter(payload.chapters, progress);
}

/**
 * Resolves all homepage continue-reading items from persisted progress and public chapters.
 */
export function resolveHomeContinueReadingItems(
  storage: ReaderStorageLike,
  books: readonly ContinueReadingBook[]
): ContinueReadingItem[] {
  return books.flatMap((book) => {
    const progress = readStoredReaderProgress(storage, book.slug);
    const chapter = resolveProgressChapter(book.chapters, progress);

    return chapter
      ? [
          {
            ...chapter,
            bookTitle: book.title
          }
        ]
      : [];
  });
}

/**
 * Applies a shared reader-preference dataset contract to one or more DOM targets.
 */
export function applyReaderPreferencesToTargets(
  preferences: ReaderPreferences,
  ...targets: Array<ReaderPreferenceTarget | null | undefined>
) {
  targets.forEach((target) => {
    if (!target) {
      return;
    }

    target.dataset.readerTheme = preferences.theme;
    target.dataset.readerFontSize = preferences.fontSize;
    target.dataset.readerLineHeight = preferences.lineHeight;
    target.dataset.readerWidth = preferences.width;
  });
}

/**
 * Reads and applies persisted reader preferences for the current browser session.
 */
export function hydrateReaderPreferences(
  storage: ReaderStorageLike,
  ...targets: Array<ReaderPreferenceTarget | null | undefined>
) {
  const preferences = readStoredReaderPreferences(storage);
  applyReaderPreferencesToTargets(preferences, ...targets);
  return preferences;
}

/**
 * Returns the directory open state expected for the active viewport.
 */
export function getDirectoryStateForViewport(isDesktopViewport: boolean) {
  return {
    open: isDesktopViewport,
    expanded: isDesktopViewport ? "true" : "false"
  };
}

/**
 * Safely parses the serialized tag payload stored on a book card.
 */
export function parseBookTags(input: string | undefined): string[] {
  const parsed = readEmbeddedJson(input, []);
  return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : [];
}

/**
 * Narrows the books-page sort control value into a supported sort mode.
 */
export function sanitizeBooksSortMode(input: string): BooksSortMode {
  return input === "title" || input === "completion" ? input : "recent";
}

/**
 * Narrows a rendered card element into a sortable/filterable books-page record.
 */
export function readBooksCardRecord(card: Element): BooksCardRecord | null {
  if (!(card instanceof HTMLElement)) {
    return null;
  }

  return {
    element: card,
    title: card.dataset.bookTitle ?? "",
    status: card.dataset.bookStatus ?? "",
    updatedAt: card.dataset.bookUpdatedAt ?? "",
    tags: parseBookTags(card.dataset.bookTags)
  };
}

/**
 * Filters and sorts books-page card records according to the active UI state.
 */
export function filterAndSortBooks(
  cards: readonly BooksCardRecord[],
  filters: BooksFilterState
): BooksCardRecord[] {
  return cards
    .filter((card) => {
      const matchesStatus = filters.status === "all" || card.status === filters.status;
      const matchesTag = filters.tag === "all" || card.tags.includes(filters.tag);
      return matchesStatus && matchesTag;
    })
    .slice()
    .sort((left, right) => {
      if (filters.sort === "title") {
        return left.title.localeCompare(right.title, "zh-CN");
      }

      if (filters.sort === "completion") {
        return (
          (completionRank[left.status] ?? 9) - (completionRank[right.status] ?? 9) ||
          left.title.localeCompare(right.title, "zh-CN")
        );
      }

      return right.updatedAt.localeCompare(left.updatedAt);
    });
}

/**
 * Builds the shared inline bootstrap used to apply reader preferences before paint.
 */
export function buildReaderPreferenceBootstrapScript() {
  const defaults = JSON.stringify(defaultReaderPreferences);
  const options = JSON.stringify(readerPreferenceOptions);
  const storageKeys = JSON.stringify(readerStorageKeys);

  return `(() => {
  const html = document.documentElement;
  const defaults = ${defaults};
  const options = ${options};
  const storageKeys = ${storageKeys};
  const readPreference = (storageKey, allowedValues, fallbackValue) => {
    try {
      const rawValue = window.localStorage.getItem(storageKey);
      return typeof rawValue === "string" && allowedValues.includes(rawValue) ? rawValue : fallbackValue;
    } catch {
      return fallbackValue;
    }
  };
  html.dataset.readerTheme = readPreference(storageKeys.theme, options.theme, defaults.theme);
  html.dataset.readerFontSize = readPreference(storageKeys.fontSize, options.fontSize, defaults.fontSize);
  html.dataset.readerLineHeight = readPreference(storageKeys.lineHeight, options.lineHeight, defaults.lineHeight);
  html.dataset.readerWidth = readPreference(storageKeys.width, options.width, defaults.width);
})();`;
}
