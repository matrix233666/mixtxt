const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const readerStorageKeys = {
  theme: "mixtxt.reader.theme",
  fontSize: "mixtxt.reader.fontSize",
  lineHeight: "mixtxt.reader.lineHeight",
  width: "mixtxt.reader.width"
} as const;

export const readerPreferenceOptions = {
  theme: ["system", "light", "dark"] as const,
  fontSize: ["small", "medium", "large"] as const,
  lineHeight: ["compact", "standard", "relaxed"] as const,
  width: ["standard", "wide"] as const
} as const;

export const readerPreferenceKeys = ["theme", "fontSize", "lineHeight", "width"] as const;

export type ReaderTheme = (typeof readerPreferenceOptions.theme)[number];
export type ReaderFontSize = (typeof readerPreferenceOptions.fontSize)[number];
export type ReaderLineHeight = (typeof readerPreferenceOptions.lineHeight)[number];
export type ReaderWidth = (typeof readerPreferenceOptions.width)[number];
export type ReaderPreferenceKey = (typeof readerPreferenceKeys)[number];

export type ReaderPreferences = {
  theme: ReaderTheme;
  fontSize: ReaderFontSize;
  lineHeight: ReaderLineHeight;
  width: ReaderWidth;
};

export type ReaderProgress = {
  bookSlug: string;
  chapterSlug: string;
};

export type ReaderStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const defaultReaderPreferences: ReaderPreferences = {
  theme: "system",
  fontSize: "medium",
  lineHeight: "standard",
  width: "standard"
};

/**
 * Builds the stable localStorage key used to persist a book's last-read chapter.
 */
export function getLastChapterStorageKey(bookSlug: string) {
  return `mixtxt.reader.lastChapter.${bookSlug}`;
}

/**
 * Returns true when the provided value matches one of the known preset options.
 */
function isAllowedOption<T extends readonly string[]>(options: T, value: unknown): value is T[number] {
  return typeof value === "string" && options.includes(value);
}

/**
 * Sanitizes partially persisted reader preferences into a stable preset model.
 */
export function sanitizeReaderPreferences(
  input: Partial<ReaderPreferences> | null | undefined
): ReaderPreferences {
  return {
    theme: isAllowedOption(readerPreferenceOptions.theme, input?.theme)
      ? input.theme
      : defaultReaderPreferences.theme,
    fontSize: isAllowedOption(readerPreferenceOptions.fontSize, input?.fontSize)
      ? input.fontSize
      : defaultReaderPreferences.fontSize,
    lineHeight: isAllowedOption(readerPreferenceOptions.lineHeight, input?.lineHeight)
      ? input.lineHeight
      : defaultReaderPreferences.lineHeight,
    width: isAllowedOption(readerPreferenceOptions.width, input?.width)
      ? input.width
      : defaultReaderPreferences.width
  };
}

/**
 * Merges a partial preference payload with defaults before sanitization.
 */
export function mergeReaderPreferences(
  input: Partial<ReaderPreferences> | null | undefined
): ReaderPreferences {
  return sanitizeReaderPreferences({
    ...defaultReaderPreferences,
    ...input
  });
}

/**
 * Converts a structured progress record into the stored {book}/{chapter} value.
 */
export function formatReaderProgress(progress: ReaderProgress) {
  return `${progress.bookSlug}/${progress.chapterSlug}`;
}

/**
 * Parses and validates a last-read chapter value for a specific public book.
 */
export function sanitizeReaderProgress(
  bookSlug: string,
  input: string | null | undefined
): ReaderProgress | null {
  if (typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const [storedBookSlug, chapterSlug, ...rest] = trimmed.split("/");
  if (
    rest.length > 0 ||
    storedBookSlug !== bookSlug ||
    !slugPattern.test(storedBookSlug) ||
    !slugPattern.test(chapterSlug ?? "")
  ) {
    return null;
  }

  return {
    bookSlug: storedBookSlug,
    chapterSlug
  };
}

/**
 * Reads all persisted reader preferences from a browser-like storage object.
 */
export function readStoredReaderPreferences(storage: ReaderStorageLike): ReaderPreferences {
  return sanitizeReaderPreferences({
    theme: (storage.getItem(readerStorageKeys.theme) ?? undefined) as ReaderTheme | undefined,
    fontSize: (storage.getItem(readerStorageKeys.fontSize) ?? undefined) as
      | ReaderFontSize
      | undefined,
    lineHeight: (storage.getItem(readerStorageKeys.lineHeight) ?? undefined) as
      | ReaderLineHeight
      | undefined,
    width: (storage.getItem(readerStorageKeys.width) ?? undefined) as ReaderWidth | undefined
  });
}

/**
 * Writes a single reader preference and returns the next fully sanitized preference state.
 */
export function writeStoredReaderPreference(
  storage: ReaderStorageLike,
  key: ReaderPreferenceKey,
  value: unknown
): ReaderPreferences {
  const current = readStoredReaderPreferences(storage);
  const next = sanitizeReaderPreferences({
    ...current,
    [key]: value
  });

  storage.setItem(readerStorageKeys[key], next[key]);
  return next;
}

/**
 * Reads a book's last valid public progress record from browser-like storage.
 */
export function readStoredReaderProgress(storage: ReaderStorageLike, bookSlug: string) {
  return sanitizeReaderProgress(bookSlug, storage.getItem(getLastChapterStorageKey(bookSlug)));
}

/**
 * Persists or clears a book's last-read chapter in browser-like storage.
 */
export function writeStoredReaderProgress(
  storage: ReaderStorageLike,
  progress: ReaderProgress | null
) {
  if (!progress) {
    return;
  }

  storage.setItem(getLastChapterStorageKey(progress.bookSlug), formatReaderProgress(progress));
}

/**
 * Resolves a sanitized progress record against the currently public chapter list.
 */
export function resolveProgressChapter<T extends { slug: string }>(
  chapters: readonly T[],
  progress: ReaderProgress | null
) {
  if (!progress) {
    return null;
  }

  return chapters.find((chapter) => chapter.slug === progress.chapterSlug) ?? null;
}
