import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const bookCardSource = path.resolve("src", "components", "BookCard.astro");
const booksIndexSource = path.resolve("src", "pages", "books", "index.astro");
const readerToolbarSource = path.resolve("src", "components", "ReaderToolbar.astro");
const baseLayoutSource = path.resolve("src", "layouts", "BaseLayout.astro");
const ensureBuiltSource = path.resolve("tests", "build", "ensure-built.ts");

describe("reader regression guards", () => {
  it("stores and parses book tags without relying on a string delimiter", () => {
    const bookCard = fs.readFileSync(bookCardSource, "utf8");
    const booksIndex = fs.readFileSync(booksIndexSource, "utf8");

    expect(bookCard).toContain('data-book-tags={JSON.stringify(book.data.tags ?? [])}');
    expect(booksIndex).toContain('JSON.parse(card.dataset.bookTags ?? "[]")');
  });

  it("keeps the directory state aligned with desktop and mobile viewports", () => {
    const source = fs.readFileSync(readerToolbarSource, "utf8");

    expect(source).toContain('window.matchMedia("(min-width: 960px)")');
    expect(source).toContain("directory.open = desktopMediaQuery.matches;");
    expect(source).toContain("if (desktopMediaQuery.matches) {");
  });

  it("sanitizes persisted reader preferences before applying them in the base layout", () => {
    const source = fs.readFileSync(baseLayoutSource, "utf8");

    expect(source).toContain("allowedValues.includes(rawValue)");
    expect(source).toContain("readPreference(storageKeys.theme, options.theme, defaults.theme)");
    expect(source).toContain("readPreference(storageKeys.width, options.width, defaults.width)");
  });

  it("recovers stale build locks before the default Vitest hook timeout", () => {
    const source = fs.readFileSync(ensureBuiltSource, "utf8");

    expect(source).toContain("const lockTtlMs = 8 * 1000;");
  });
});
