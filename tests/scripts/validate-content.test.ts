import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateProjectContent } from "../../scripts/validate-content.mjs";

const fixturesRoot = path.resolve("tests/fixtures");

describe("validateProjectContent", () => {
  it("accepts a valid content tree", async () => {
    await expect(
      validateProjectContent({
        projectRoot: path.join(fixturesRoot, "valid"),
        astroSite: "https://mixtxt.example.com"
      })
    ).resolves.toEqual([]);
  });

  it("rejects a published chapter that belongs to a hidden book", async () => {
    await expect(
      validateProjectContent({
        projectRoot: path.join(fixturesRoot, "invalid-hidden-book"),
        astroSite: "https://mixtxt.example.com"
      })
    ).resolves.toContain('Published chapter book-001-start.md belongs to non-public book "book".');
  });
});
