import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { ensureSiteBuilt } from "./ensure-built";

const searchBoxSource = path.resolve("src", "components", "SearchBox.astro");
let distDir: string;

describe("search page build", () => {
  beforeAll(async () => {
    distDir = await ensureSiteBuilt();
  });

  it("builds the search page", () => {
    const html = fs.readFileSync(path.join(distDir, "search", "index.html"), "utf8");

    expect(html).toContain("搜索");
    expect(html).toContain("Pagefind");
    expect(html).toContain("/pagefind/pagefind.js");
  });

  it("generates pagefind assets", () => {
    const pagefindDir = path.join(distDir, "pagefind");
    expect(fs.existsSync(pagefindDir)).toBe(true);
    expect(fs.readdirSync(pagefindDir).length).toBeGreaterThan(0);
  });

  it("builds search results without innerHTML rendering", () => {
    const source = fs.readFileSync(searchBoxSource, "utf8");

    expect(source).not.toContain("innerHTML");
    expect(source).toContain("document.createElement");
  });
});
