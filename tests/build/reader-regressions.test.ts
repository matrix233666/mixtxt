import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readerToolbarSource = path.resolve("src", "components", "ReaderToolbar.astro");
const baseLayoutSource = path.resolve("src", "layouts", "BaseLayout.astro");

describe("reader regression guards", () => {
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
});
