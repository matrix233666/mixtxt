import fs from "node:fs/promises";
import path from "node:path";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const chapterNoPattern = /^[0-9]{3}$/;

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return {};

  return Object.fromEntries(
    match[1]
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const index = line.indexOf(":");
        const key = line.slice(0, index).trim();
        const rawValue = line.slice(index + 1).trim().replace(/^"|"$/g, "");
        return [key, rawValue];
      })
  );
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readDirFiles(dirPath) {
  try {
    const names = await fs.readdir(dirPath);
    return names.sort().map((name) => path.join(dirPath, name));
  } catch {
    return [];
  }
}

export async function validateProjectContent({
  projectRoot = process.cwd(),
  astroSite = "https://mixtxt.example.com"
} = {}) {
  const errors = [];

  const sitePath = path.join(projectRoot, "src/data/site.json");
  const site = await readJson(sitePath);

  if (site.baseUrl !== astroSite) {
    errors.push(`site.baseUrl "${site.baseUrl}" does not match Astro site "${astroSite}".`);
  }

  const bookFiles = await readDirFiles(path.join(projectRoot, "src/content/books"));
  const chapterFiles = await readDirFiles(path.join(projectRoot, "src/content/chapters"));

  const books = await Promise.all(bookFiles.map(readJson));
  const bookBySlug = new Map();

  for (const book of books) {
    if (!slugPattern.test(book.slug)) {
      errors.push(`Invalid book slug "${book.slug}".`);
    }

    if (bookBySlug.has(book.slug)) {
      errors.push(`Duplicate book slug "${book.slug}".`);
    }

    if (book.copyrightStatus === "private-draft" && book.visibility !== "hidden") {
      errors.push(`Book "${book.slug}" must be hidden when copyrightStatus is private-draft.`);
    }

    if (book.copyrightStatus === "unknown" && book.visibility === "public") {
      errors.push(`Book "${book.slug}" cannot be public when copyrightStatus is unknown.`);
    }

    bookBySlug.set(book.slug, book);
  }

  const perBookChapterNos = new Map();
  const perBookChapterSlugs = new Map();

  for (const chapterPath of chapterFiles) {
    const fileName = path.basename(chapterPath);
    const frontmatter = parseFrontmatter(await fs.readFile(chapterPath, "utf8"));
    const book = bookBySlug.get(frontmatter.book);

    if (!slugPattern.test(frontmatter.book ?? "")) {
      errors.push(`Invalid chapter book reference in ${fileName}.`);
    }

    if (!chapterNoPattern.test(frontmatter.chapterNo ?? "")) {
      errors.push(`Invalid chapterNo "${frontmatter.chapterNo}" in ${fileName}.`);
    }

    if (!slugPattern.test(frontmatter.slug ?? "")) {
      errors.push(`Invalid chapter slug "${frontmatter.slug}" in ${fileName}.`);
    }

    if (!book) {
      errors.push(`Chapter ${fileName} references missing book "${frontmatter.book}".`);
      continue;
    }

    const chapterNoKey = `${frontmatter.book}:${frontmatter.chapterNo}`;
    const chapterSlugKey = `${frontmatter.book}:${frontmatter.slug}`;

    if (perBookChapterNos.has(chapterNoKey)) {
      errors.push(`Duplicate chapterNo "${frontmatter.chapterNo}" in book "${frontmatter.book}".`);
    }

    if (perBookChapterSlugs.has(chapterSlugKey)) {
      errors.push(`Duplicate chapter slug "${frontmatter.slug}" in book "${frontmatter.book}".`);
    }

    perBookChapterNos.set(chapterNoKey, true);
    perBookChapterSlugs.set(chapterSlugKey, true);

    if (frontmatter.status === "published" && book.visibility !== "public") {
      errors.push(`Published chapter ${fileName} belongs to non-public book "${frontmatter.book}".`);
    }
  }

  return errors;
}

const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (invokedDirectly) {
  const astroSite = "https://mixtxt.example.com";
  const errors = await validateProjectContent({ projectRoot: process.cwd(), astroSite });

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }
    process.exit(1);
  }

  console.log("Content validation passed.");
}
