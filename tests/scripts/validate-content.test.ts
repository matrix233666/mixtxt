import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateProjectContent } from "../../scripts/validate-content.mjs";

const fixturesRoot = path.resolve("tests/fixtures");
const validFixtureRoot = path.join(fixturesRoot, "valid");

async function createTempProject(
  transform?: (projectRoot: string) => Promise<void> | void
) {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mixtxt-validate-content-"));
  await fs.cp(validFixtureRoot, projectRoot, { recursive: true });
  await transform?.(projectRoot);
  return projectRoot;
}

async function withTempProject(
  transform: (projectRoot: string) => Promise<void> | void,
  run: (projectRoot: string) => Promise<void>
) {
  const projectRoot = await createTempProject(transform);

  try {
    await run(projectRoot);
  } finally {
    await fs.rm(projectRoot, { recursive: true, force: true });
  }
}

async function writeJson(filePath: string, value: unknown) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

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

  it("rejects invalid book enums and invalid chapter status", async () => {
    await withTempProject(
      async (root) => {
        const bookPath = path.join(root, "src/content/books/book.json");
        const book = JSON.parse(await fs.readFile(bookPath, "utf8"));
        book.status = "retired";
        book.visibility = "secret";
        book.copyrightStatus = "pirated";
        await writeJson(bookPath, book);

        await fs.writeFile(path.join(root, "src/content/books/ignore.txt"), "ignore", "utf8");
        await fs.mkdir(path.join(root, "src/content/chapters/nested"));
        await fs.writeFile(path.join(root, "src/content/chapters/nested/ignore.md"), "---\n---\n", "utf8");

        const chapterPath = path.join(root, "src/content/chapters/book-001-start.md");
        const chapter = await fs.readFile(chapterPath, "utf8");
        await fs.writeFile(
          chapterPath,
          chapter.replace('status: "published"', 'status: "live"'),
          "utf8"
        );
      },
      async (projectRoot) => {
        await expect(
          validateProjectContent({
            projectRoot,
            astroSite: "https://mixtxt.example.com"
          })
        ).resolves.toEqual([
          'Invalid book status "retired" for "book".',
          'Invalid book visibility "secret" for "book".',
          'Invalid book copyrightStatus "pirated" for "book".',
          'Invalid chapter status "live" in book-001-start.md.'
        ]);
      }
    );
  });

  it("uses astro.config.mjs as the default site target", async () => {
    await withTempProject(
      async (root) => {
        const sitePath = path.join(root, "src/data/site.json");
        const site = JSON.parse(await fs.readFile(sitePath, "utf8"));
        site.baseUrl = "https://site.example.com";
        await writeJson(sitePath, site);

        await fs.writeFile(
          path.join(root, "astro.config.mjs"),
          'export default {\n  site: "https://astro.example.com",\n  output: "static"\n};\n',
          "utf8"
        );
      },
      async (projectRoot) => {
        await expect(
          validateProjectContent({
            projectRoot
          })
        ).resolves.toEqual([
          'site.baseUrl "https://site.example.com" does not match Astro site "https://astro.example.com".'
        ]);
      }
    );
  });
});
