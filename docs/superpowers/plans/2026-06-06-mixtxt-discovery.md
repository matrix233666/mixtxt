# MixTXT Discovery And Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add static discovery and distribution capabilities to MixTXT: Pagefind-powered search, tag discovery pages, releases listing, RSS output, sitemap output, and shared public filtering across all of them.

**Architecture:** Extend the existing `src/lib/content.ts` query layer so every discovery surface consumes the same public-book and published-chapter rules. Generate public HTML with Astro first, then run `pagefind --site dist` so the search index is derived from already-public pages. Keep XML outputs thin by delegating data shaping to shared helpers instead of embedding publication logic inside route files.

**Tech Stack:** Astro, TypeScript, Vitest, Pagefind, existing content collections, static XML endpoints

---

### Task 1: Extend Shared Discovery Queries

**Files:**
- Create: `tests/lib/discovery-content.test.ts`
- Modify: `src/lib/content.ts`

- [ ] **Step 1: Write the failing tests for discovery helpers**

```ts
// tests/lib/discovery-content.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("astro:content", () => ({
  getCollection: vi.fn()
}));

import { getCollection } from "astro:content";
import {
  filterPublicBooks,
  getBooksByTag,
  getPublicReleases,
  getPublicSitemapEntries,
  getRecentPublicUpdates
} from "../../src/lib/content";

const books = [
  {
    id: "books/public-book.json",
    collection: "books",
    data: {
      slug: "public-book",
      title: "Public Book",
      visibility: "public",
      updatedAt: "2026-06-05",
      tags: ["科幻", "AI改编"]
    }
  },
  {
    id: "books/hidden-book.json",
    collection: "books",
    data: {
      slug: "hidden-book",
      title: "Hidden Book",
      visibility: "hidden",
      updatedAt: "2026-06-06",
      tags: ["隐藏"]
    }
  }
] as const;

const chapters = [
  {
    id: "chapters/public-book-001.md",
    collection: "chapters",
    data: {
      book: "public-book",
      chapterNo: "001",
      slug: "start",
      title: "Start",
      summary: "Opening chapter",
      status: "published",
      updatedAt: "2026-06-05"
    }
  },
  {
    id: "chapters/public-book-002.md",
    collection: "chapters",
    data: {
      book: "public-book",
      chapterNo: "002",
      slug: "signal",
      title: "Signal",
      summary: "Second chapter",
      status: "published",
      updatedAt: "2026-06-06"
    }
  },
  {
    id: "chapters/hidden-book-001.md",
    collection: "chapters",
    data: {
      book: "hidden-book",
      chapterNo: "001",
      slug: "secret",
      title: "Secret",
      summary: "Should not surface",
      status: "published",
      updatedAt: "2026-06-07"
    }
  }
] as const;

const releases = [
  {
    id: "releases/public-book-v0-1-0.md",
    collection: "releases",
    body: "Public release body",
    data: {
      book: "public-book",
      version: "v0.1.0",
      versionSlug: "v0-1-0",
      title: "Public Release",
      date: "2026-06-06",
      gitTag: "v0.1.0"
    }
  },
  {
    id: "releases/hidden-book-v0-1-0.md",
    collection: "releases",
    body: "Hidden release body",
    data: {
      book: "hidden-book",
      version: "v0.1.0",
      versionSlug: "v0-1-0",
      title: "Hidden Release",
      date: "2026-06-07",
      gitTag: "hidden-v0.1.0"
    }
  }
] as const;

const mockedGetCollection = vi.mocked(getCollection);

beforeEach(() => {
  mockedGetCollection.mockReset();
  mockedGetCollection.mockImplementation(async (name: string) => {
    if (name === "books") return books as never;
    if (name === "chapters") return chapters as never;
    if (name === "releases") return releases as never;
    throw new Error(`Unexpected collection ${name}`);
  });
});

describe("discovery content helpers", () => {
  it("returns only public books for a tag", async () => {
    await expect(getBooksByTag("科幻")).resolves.toMatchObject([
      { data: { slug: "public-book" } }
    ]);
    await expect(getBooksByTag("隐藏")).resolves.toEqual([]);
  });

  it("returns only releases for public books sorted by date desc", async () => {
    await expect(getPublicReleases()).resolves.toMatchObject([
      { data: { book: "public-book", title: "Public Release" } }
    ]);
  });

  it("returns recent public updates from published public chapters only", async () => {
    await expect(getRecentPublicUpdates(1)).resolves.toMatchObject([
      {
        kind: "chapter",
        chapter: { data: { slug: "signal" } }
      }
    ]);
  });

  it("returns sitemap entries without hidden-book routes", async () => {
    const entries = await getPublicSitemapEntries();

    expect(entries).toEqual([
      "/",
      "/books/public-book/",
      "/books/public-book/start/",
      "/books/public-book/signal/",
      "/releases/",
      "/search/",
      "/tags/ai%E6%94%B9%E7%BC%96/",
      "/tags/%E7%A7%91%E5%B9%BB/"
    ]);
    expect(entries.some((entry) => entry.includes("hidden-book"))).toBe(false);
  });

  it("still keeps public-book filtering behavior intact", () => {
    expect(filterPublicBooks(books).map((book) => book.data.slug)).toEqual(["public-book"]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- --run tests/lib/discovery-content.test.ts`

Expected: FAIL with missing exports such as `getBooksByTag` or `getPublicReleases`

- [ ] **Step 3: Extend the shared content query layer**

```ts
// src/lib/content.ts
import { getCollection } from "astro:content";

type Visibility = "public" | "hidden";
type ChapterStatus = "draft" | "review" | "published" | "archived";

export type BookEntryLike = {
  id: string;
  data: {
    slug: string;
    title?: string;
    visibility: Visibility;
    updatedAt: string;
    tags?: readonly string[];
  };
};

export type ChapterEntryLike = {
  id: string;
  data: {
    book: string;
    chapterNo: string;
    slug: string;
    title?: string;
    summary?: string;
    status: ChapterStatus;
    updatedAt: string;
  };
};

export type ReleaseEntryLike = {
  id: string;
  body?: string;
  data: {
    book: string;
    version: string;
    versionSlug: string;
    title: string;
    date: string;
    gitTag?: string;
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
    .sort(
      (a, b) =>
        a.data.chapterNo.localeCompare(b.data.chapterNo) ||
        a.data.book.localeCompare(b.data.book) ||
        a.data.slug.localeCompare(b.data.slug)
    );
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

export function filterPublicReleases<T extends ReleaseEntryLike, B extends BookEntryLike>(
  releases: readonly T[],
  books: readonly B[]
) {
  const publicBookSlugs = new Set(filterPublicBooks(books).map((book) => book.data.slug));

  return [...releases]
    .filter((release) => publicBookSlugs.has(release.data.book))
    .sort((a, b) => b.data.date.localeCompare(a.data.date));
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
  const normalizedLimit = Math.max(0, limit);

  return [...chapters]
    .sort(
      (a, b) =>
        b.data.updatedAt.localeCompare(a.data.updatedAt) ||
        a.data.book.localeCompare(b.data.book) ||
        a.data.chapterNo.localeCompare(b.data.chapterNo)
    )
    .slice(0, normalizedLimit);
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

export async function getBooksByTag(tag: string) {
  const books = await getPublicBooks();
  return books.filter((book) => (book.data.tags ?? []).includes(tag));
}

export async function getPublicReleases() {
  const [books, releases] = await Promise.all([
    getCollection("books"),
    getCollection("releases")
  ]);

  return filterPublicReleases(releases, books);
}

export async function getRecentPublicUpdates(limit = 10) {
  const chapters = await getRecentChapters(limit);
  return chapters.map((chapter) => ({
    kind: "chapter" as const,
    chapter
  }));
}

export async function getPublicSitemapEntries() {
  const [books, tags, chapters] = await Promise.all([
    getPublicBooks(),
    getAllTags(),
    getPublishedChapters()
  ]);

  const routes = new Set<string>(["/", "/search/", "/releases/"]);

  for (const book of books) {
    routes.add(`/books/${book.data.slug}/`);
  }

  for (const chapter of chapters) {
    routes.add(`/books/${chapter.data.book}/${chapter.data.slug}/`);
  }

  for (const tag of tags) {
    routes.add(`/tags/${encodeURIComponent(tag).toLowerCase()}/`);
  }

  return [...routes].sort((a, b) => a.localeCompare(b));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- --run tests/lib/discovery-content.test.ts`

Expected: PASS with `5 passed`

- [ ] **Step 5: Commit the discovery queries**

```bash
git add tests/lib/discovery-content.test.ts src/lib/content.ts
git commit -m "feat: extend discovery content helpers"
```

### Task 2: Integrate Pagefind And Build The Search Page

**Files:**
- Create: `tests/build/search-page.test.ts`
- Create: `src/components/SearchBox.astro`
- Create: `src/pages/search.astro`
- Create: `src/styles/search.css`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Write the failing build smoke test for the search page**

```ts
// tests/build/search-page.test.ts
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const distDir = path.resolve("dist");

describe("search page build", () => {
  beforeAll(() => {
    execSync("npm run build", { stdio: "pipe" });
  });

  it("builds the search page", () => {
    const html = fs.readFileSync(path.join(distDir, "search", "index.html"), "utf8");

    expect(html).toContain("搜索");
    expect(html).toContain("Pagefind");
  });

  it("generates pagefind assets", () => {
    const pagefindDir = path.join(distDir, "pagefind");
    expect(fs.existsSync(pagefindDir)).toBe(true);
    expect(fs.readdirSync(pagefindDir).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- --run tests/build/search-page.test.ts`

Expected: FAIL because `/search/index.html` and `dist/pagefind/` do not exist yet

- [ ] **Step 3: Add Pagefind to the build workflow and create the search UI**

```json
// package.json
{
  "name": "mixtxt",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "check": "astro check",
    "test": "node scripts/run-vitest.mjs",
    "validate:content": "node scripts/validate-content.mjs",
    "build": "npm run validate:content && astro build && pagefind --site dist",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^5.10.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.9",
    "@types/node": "^22.15.30",
    "gray-matter": "^4.0.3",
    "pagefind": "^1.3.0",
    "typescript": "^5.8.3",
    "vitest": "^2.1.8"
  }
}
```

```astro
--- 
// src/components/SearchBox.astro
import "../styles/search.css";
---

<section class="search-shell card-surface">
  <div class="search-shell__copy">
    <p class="eyebrow">Search</p>
    <h1>搜索</h1>
    <p>输入关键词，搜索已公开的书籍和章节。</p>
  </div>

  <div class="search-shell__form">
    <label class="search-label" for="search-input">关键词</label>
    <input class="search-input" id="search-input" type="search" placeholder="例如：黄巾、三国、星火" />
  </div>

  <div class="search-results" id="search-results">
    <p class="search-results__empty">Pagefind 搜索结果会显示在这里。</p>
  </div>
</section>

<script>
  const input = document.querySelector("#search-input");
  const results = document.querySelector("#search-results");

  let pagefind;

  async function ensurePagefind() {
    if (!pagefind) {
      pagefind = await import("/pagefind/pagefind.js");
    }

    return pagefind;
  }

  async function runSearch(term) {
    if (!results) return;

    if (!term.trim()) {
      results.innerHTML = '<p class="search-results__empty">Pagefind 搜索结果会显示在这里。</p>';
      return;
    }

    const api = await ensurePagefind();
    const search = await api.search(term);
    const items = await Promise.all(search.results.slice(0, 8).map((item) => item.data()));

    if (items.length === 0) {
      results.innerHTML = '<p class="search-results__empty">没有匹配结果。</p>';
      return;
    }

    results.innerHTML = items
      .map(
        (item) => `
          <article class="search-result">
            <a href="${item.url}">
              <h2>${item.meta.title}</h2>
              <p>${item.excerpt}</p>
            </a>
          </article>
        `
      )
      .join("");
  }

  input?.addEventListener("input", (event) => {
    runSearch(event.currentTarget instanceof HTMLInputElement ? event.currentTarget.value : "");
  });
</script>
```

```astro
---
// src/pages/search.astro
import AppFooter from "../components/AppFooter.astro";
import AppHeader from "../components/AppHeader.astro";
import SearchBox from "../components/SearchBox.astro";
import BaseLayout from "../layouts/BaseLayout.astro";
---

<BaseLayout title="搜索 | MixTXT" description="搜索已公开的书籍与章节">
  <AppHeader />
  <main class="page-shell page-stack">
    <SearchBox />
  </main>
  <AppFooter />
</BaseLayout>
```

```css
/* src/styles/search.css */
.search-shell {
  display: grid;
  gap: 20px;
}

.search-shell__copy {
  display: grid;
  gap: 10px;
}

.search-shell__form {
  display: grid;
  gap: 8px;
}

.search-label {
  color: var(--muted);
  font-size: 0.95rem;
}

.search-input {
  width: 100%;
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text);
  font: inherit;
}

.search-results {
  display: grid;
  gap: 12px;
}

.search-results__empty {
  color: var(--muted);
}

.search-result {
  border: 1px solid var(--line);
  background: var(--surface-alt);
}

.search-result a {
  display: grid;
  gap: 10px;
  padding: 16px;
}

.search-result p {
  color: var(--muted);
}
```

```css
/* append to src/styles/global.css */
.section-link {
  color: var(--accent);
}
```

- [ ] **Step 4: Install the new dependency**

Run: `npm install`

Expected: `pagefind` is added to `package-lock.json`

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test -- --run tests/build/search-page.test.ts`

Expected: PASS with `2 passed`

- [ ] **Step 6: Commit the search page**

```bash
git add package.json package-lock.json src/components/SearchBox.astro src/pages/search.astro src/styles/search.css src/styles/global.css tests/build/search-page.test.ts
git commit -m "feat: add static search page"
```

### Task 3: Build Tag Discovery Pages

**Files:**
- Create: `tests/build/tag-pages.test.ts`
- Create: `src/pages/tags/[tag].astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Write the failing build smoke test for tag pages**

```ts
// tests/build/tag-pages.test.ts
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const distDir = path.resolve("dist");

describe("tag pages", () => {
  beforeAll(() => {
    execSync("npm run build", { stdio: "pipe" });
  });

  it("builds a tag page from public-book tags only", () => {
    const html = fs.readFileSync(
      path.join(distDir, "tags", encodeURIComponent("科幻").toLowerCase(), "index.html"),
      "utf8"
    );

    expect(html).toContain("科幻");
    expect(html).toContain("三国演义：星火纪元");
    expect(html).not.toContain("Hidden Book");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- --run tests/build/tag-pages.test.ts`

Expected: FAIL because `/tags/<tag>/index.html` does not exist yet

- [ ] **Step 3: Add tag discovery pages and homepage entry**

```astro
---
// src/pages/tags/[tag].astro
import AppFooter from "../../components/AppFooter.astro";
import AppHeader from "../../components/AppHeader.astro";
import BookCard from "../../components/BookCard.astro";
import BaseLayout from "../../layouts/BaseLayout.astro";
import { getAllTags, getBooksByTag } from "../../lib/content";

export async function getStaticPaths() {
  const tags = await getAllTags();

  return tags.map((tag) => ({
    params: {
      tag: encodeURIComponent(tag).toLowerCase()
    },
    props: {
      tag
    }
  }));
}

const { tag } = Astro.props;
const books = await getBooksByTag(tag);
---

<BaseLayout title={`${tag} | MixTXT`} description={`浏览标签 ${tag} 下的公开书籍`}>
  <AppHeader />
  <main class="page-shell page-stack">
    <section class="section-block">
      <p class="eyebrow">Tag</p>
      <h1>{tag}</h1>
      <p>这个标签下的公开书籍。</p>
      <div class="book-grid">
        {books.map((book) => (
          <BookCard book={book} />
        ))}
      </div>
    </section>
  </main>
  <AppFooter />
</BaseLayout>
```

```astro
---
// src/pages/index.astro
import AppFooter from "../components/AppFooter.astro";
import AppHeader from "../components/AppHeader.astro";
import BookCard from "../components/BookCard.astro";
import BaseLayout from "../layouts/BaseLayout.astro";
import { getAllTags, getPublicBooks, getRecentChapters } from "../lib/content";

const books = await getPublicBooks();
const recentChapters = await getRecentChapters(5);
const tags = await getAllTags();
---

<BaseLayout>
  <AppHeader />
  <main class="page-shell page-stack">
    <section class="hero-block">
      <p class="eyebrow">AI 改编小说</p>
      <h1>MixTXT</h1>
      <p>用 AI 改编经典小说的个人创作站。</p>
      <div class="tag-row" aria-label="发现入口">
        <li><a class="section-link" href="/search/">搜索</a></li>
        <li><a class="section-link" href="/releases/">版本说明</a></li>
      </div>
    </section>

    <section class="section-block">
      <div class="section-header">
        <h2>书籍</h2>
      </div>
      <div class="book-grid">
        {books.map((book) => (
          <BookCard book={book} />
        ))}
      </div>
    </section>

    <section class="section-block">
      <div class="section-header">
        <h2>标签</h2>
      </div>
      <ul class="tag-row" aria-label="公开标签">
        {tags.map((tag) => (
          <li>
            <a href={`/tags/${encodeURIComponent(tag).toLowerCase()}/`}>{tag}</a>
          </li>
        ))}
      </ul>
    </section>

    <section class="section-block">
      <div class="section-header">
        <h2>最近更新</h2>
      </div>
      <ul class="recent-list">
        {recentChapters.map((chapter) => (
          <li>
            <a href={`/books/${chapter.data.book}/${chapter.data.slug}/`}>
              <strong>{chapter.data.title}</strong>
              <span>{chapter.data.book}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  </main>
  <AppFooter />
</BaseLayout>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- --run tests/build/tag-pages.test.ts`

Expected: PASS with `1 passed`

- [ ] **Step 5: Commit the tag pages**

```bash
git add src/pages/tags/[tag].astro src/pages/index.astro tests/build/tag-pages.test.ts
git commit -m "feat: add tag discovery pages"
```

### Task 4: Build Public Releases Page

**Files:**
- Create: `tests/build/releases-page.test.ts`
- Create: `src/pages/releases/index.astro`

- [ ] **Step 1: Write the failing build smoke test for the releases page**

```ts
// tests/build/releases-page.test.ts
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const distDir = path.resolve("dist");

describe("releases page", () => {
  beforeAll(() => {
    execSync("npm run build", { stdio: "pipe" });
  });

  it("builds the releases page using public releases only", () => {
    const html = fs.readFileSync(path.join(distDir, "releases", "index.html"), "utf8");

    expect(html).toContain("版本说明");
    expect(html).toContain("前两章试读版");
    expect(html).not.toContain("Hidden Release");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- --run tests/build/releases-page.test.ts`

Expected: FAIL because `/releases/index.html` does not exist yet

- [ ] **Step 3: Add the releases page**

```astro
---
// src/pages/releases/index.astro
import AppFooter from "../../components/AppFooter.astro";
import AppHeader from "../../components/AppHeader.astro";
import BaseLayout from "../../layouts/BaseLayout.astro";
import { getBookBySlug, getPublicReleases } from "../../lib/content";

const releases = await getPublicReleases();
const releasesWithBooks = await Promise.all(
  releases.map(async (release) => ({
    release,
    book: await getBookBySlug(release.data.book)
  }))
);
---

<BaseLayout title="版本说明 | MixTXT" description="公开发布节点与试读说明">
  <AppHeader />
  <main class="page-shell page-stack">
    <section class="section-block">
      <p class="eyebrow">Releases</p>
      <h1>版本说明</h1>
      <div class="recent-list">
        {releasesWithBooks.map(({ release, book }) => (
          <article class="card-surface">
            <p class="eyebrow">{release.data.date}</p>
            <h2>{release.data.title}</h2>
            <p>{book?.data.title}</p>
            <p>{release.body}</p>
          </article>
        ))}
      </div>
    </section>
  </main>
  <AppFooter />
</BaseLayout>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- --run tests/build/releases-page.test.ts`

Expected: PASS with `1 passed`

- [ ] **Step 5: Commit the releases page**

```bash
git add src/pages/releases/index.astro tests/build/releases-page.test.ts
git commit -m "feat: add public releases page"
```

### Task 5: Add RSS And Sitemap Outputs

**Files:**
- Create: `tests/build/distribution-outputs.test.ts`
- Create: `src/pages/rss.xml.ts`
- Create: `src/pages/sitemap.xml.ts`

- [ ] **Step 1: Write the failing build tests for RSS and sitemap**

```ts
// tests/build/distribution-outputs.test.ts
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const distDir = path.resolve("dist");

describe("distribution outputs", () => {
  beforeAll(() => {
    execSync("npm run build", { stdio: "pipe" });
  });

  it("builds rss.xml with public chapters only", () => {
    const xml = fs.readFileSync(path.join(distDir, "rss.xml"), "utf8");

    expect(xml).toContain("<title>MixTXT RSS</title>");
    expect(xml).toContain("黄巾初起");
    expect(xml).not.toContain("Hidden Release");
  });

  it("builds sitemap.xml with public URLs only", () => {
    const xml = fs.readFileSync(path.join(distDir, "sitemap.xml"), "utf8");

    expect(xml).toContain("/search/");
    expect(xml).toContain("/releases/");
    expect(xml).toContain("/books/sanguo-scifi/huangjin/");
    expect(xml).not.toContain("hidden-book");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- --run tests/build/distribution-outputs.test.ts`

Expected: FAIL because `dist/rss.xml` and `dist/sitemap.xml` do not exist yet

- [ ] **Step 3: Add RSS and sitemap endpoints**

```ts
// src/pages/rss.xml.ts
import type { APIRoute } from "astro";
import { getRecentPublicUpdates } from "../lib/content";
import { getSiteConfig } from "../lib/site";

export const GET: APIRoute = async () => {
  const site = getSiteConfig();
  const updates = await getRecentPublicUpdates(20);

  const items = updates
    .map(({ chapter }) => {
      const url = `${site.baseUrl}/books/${chapter.data.book}/${chapter.data.slug}/`;
      return `
        <item>
          <title>${chapter.data.title}</title>
          <link>${url}</link>
          <guid>${url}</guid>
          <description>${chapter.data.summary ?? ""}</description>
          <pubDate>${new Date(chapter.data.updatedAt).toUTCString()}</pubDate>
        </item>
      `;
    })
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>MixTXT RSS</title>
    <link>${site.baseUrl}</link>
    <description>${site.description}</description>
    ${items}
  </channel>
</rss>`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8"
      }
    }
  );
};
```

```ts
// src/pages/sitemap.xml.ts
import type { APIRoute } from "astro";
import { getPublicSitemapEntries } from "../lib/content";
import { getSiteConfig } from "../lib/site";

export const GET: APIRoute = async () => {
  const site = getSiteConfig();
  const entries = await getPublicSitemapEntries();

  const urls = entries
    .map(
      (entry) => `
        <url>
          <loc>${site.baseUrl}${entry}</loc>
        </url>
      `
    )
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
</urlset>`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8"
      }
    }
  );
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- --run tests/build/distribution-outputs.test.ts`

Expected: PASS with `2 passed`

- [ ] **Step 5: Commit the distribution outputs**

```bash
git add src/pages/rss.xml.ts src/pages/sitemap.xml.ts tests/build/distribution-outputs.test.ts
git commit -m "feat: add RSS and sitemap outputs"
```

### Task 6: Run The Full Discovery Verification Sweep

**Files:**
- Modify: `package-lock.json` if dependency graph changes from prior tasks

- [ ] **Step 1: Run the full test suite**

Run: `npm run test -- --run`

Expected: PASS with all site, content, validator, reader, route, search, tag, release, and distribution tests green

- [ ] **Step 2: Run Astro and type validation**

Run: `npm run check`

Expected: PASS with `0 errors`, `0 warnings`, `0 hints`

- [ ] **Step 3: Run content validation directly**

Run: `npm run validate:content`

Expected: `Content validation passed.`

- [ ] **Step 4: Run the production build and inspect generated discovery artifacts**

Run: `npm run build`

Expected:
- content validation passes first
- Astro build succeeds
- `pagefind --site dist` succeeds
- `dist/search/index.html` exists
- `dist/releases/index.html` exists
- `dist/rss.xml` exists
- `dist/sitemap.xml` exists
- `dist/pagefind/` exists with generated assets

- [ ] **Step 5: Commit the verified discovery layer**

```bash
git add package-lock.json
git commit -m "chore: verify MixTXT discovery build"
```
