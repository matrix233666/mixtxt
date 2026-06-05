import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const chapterNoPattern = /^[0-9]{3}$/;
const bookStatusValues = new Set(["planning", "serializing", "completed", "paused"]);
const bookVisibilityValues = new Set(["public", "hidden"]);
const bookCopyrightStatusValues = new Set([
  "public-domain",
  "authorized",
  "private-draft",
  "unknown"
]);
const chapterStatusValues = new Set(["draft", "review", "published", "archived"]);

function parseFrontmatter(markdown) {
  return matter(markdown).data;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readDirFiles(dirPath, extension) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
      .map((entry) => entry.name)
      .sort()
      .map((name) => path.join(dirPath, name));
  } catch {
    return [];
  }
}

async function readAstroSite(projectRoot) {
  const astroConfigPath = path.join(projectRoot, "astro.config.mjs");

  try {
    await fs.access(astroConfigPath);
  } catch {
    return undefined;
  }

  const astroConfigModule = await import(pathToFileURL(astroConfigPath).href);
  return astroConfigModule.default?.site;
}

export async function validateProjectContent({
  projectRoot = process.cwd(),
  astroSite
} = {}) {
  const errors = [];
  const resolvedAstroSite = astroSite ?? (await readAstroSite(projectRoot));

  const sitePath = path.join(projectRoot, "src/data/site.json");
  const site = await readJson(sitePath);

  if (resolvedAstroSite && site.baseUrl !== resolvedAstroSite) {
    errors.push(`site.baseUrl "${site.baseUrl}" does not match Astro site "${resolvedAstroSite}".`);
  }

  const bookFiles = await readDirFiles(path.join(projectRoot, "src/content/books"), ".json");
  const chapterFiles = await readDirFiles(path.join(projectRoot, "src/content/chapters"), ".md");

  const books = await Promise.all(bookFiles.map(readJson));
  const bookBySlug = new Map();

  for (const book of books) {
    if (!slugPattern.test(book.slug)) {
      errors.push(`Invalid book slug "${book.slug}".`);
    }

    if (!bookStatusValues.has(book.status)) {
      errors.push(`Invalid book status "${book.status}" for "${book.slug}".`);
    }

    if (!bookVisibilityValues.has(book.visibility)) {
      errors.push(`Invalid book visibility "${book.visibility}" for "${book.slug}".`);
    }

    if (!bookCopyrightStatusValues.has(book.copyrightStatus)) {
      errors.push(`Invalid book copyrightStatus "${book.copyrightStatus}" for "${book.slug}".`);
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

    if (!chapterStatusValues.has(frontmatter.status)) {
      errors.push(`Invalid chapter status "${frontmatter.status}" in ${fileName}.`);
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
  const errors = await validateProjectContent({ projectRoot: process.cwd() });

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }
    process.exit(1);
  }

  console.log("Content validation passed.");
}
