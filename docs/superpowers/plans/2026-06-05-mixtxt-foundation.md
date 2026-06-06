# MixTXT Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working MixTXT foundation: validated structured content, CMS-ready files, and a public reading flow from homepage to book page to chapter page.

**Architecture:** Implement a static-first Astro application with content collections as the source of typed content, a shared query layer for all public filtering rules, a standalone validation script that blocks invalid content before build, and a minimal reader-oriented UI shell. Use Vitest for fast red-green checks around pure helpers, the validation script, and built route output.

**Tech Stack:** Astro, TypeScript, Vitest, Node.js, Pages CMS YAML config, Markdown content collections

---

### Task 1: Bootstrap Astro And Test Tooling

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/env.d.ts`
- Create: `.gitignore`

- [ ] **Step 1: Create the project manifest and scripts**

```json
{
  "name": "mixtxt",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "check": "astro check",
    "test": "vitest --passWithNoTests",
    "validate:content": "node scripts/validate-content.mjs",
    "build": "npm run validate:content && astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^5.10.0"
  },
  "devDependencies": {
    "@types/node": "^22.15.30",
    "typescript": "^5.8.3",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create the Astro, TypeScript, Vitest, and ignore-file baseline**

```js
// astro.config.mjs
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://mixtxt.example.com",
  output: "static"
});
```

```json
// tsconfig.json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": "."
  }
}
```

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"]
  }
});
```

```ts
// src/env.d.ts
/// <reference types="astro/client" />
```

```gitignore
# dependencies
node_modules/

# build
dist/
.astro/

# local tooling
.superpowers/

# macOS noise
.DS_Store
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`

Expected: `added ... packages` and a generated `package-lock.json`

- [ ] **Step 4: Verify the toolchain can run before feature work starts**

Run: `npm run test`

Expected: Vitest exits successfully with a message equivalent to `No test files found`

- [ ] **Step 5: Commit the bootstrap**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json vitest.config.ts src/env.d.ts .gitignore
git commit -m "chore: bootstrap Astro foundation"
```

### Task 2: Add Site Config, Collections, Sample Content, And CMS Skeleton

**Files:**
- Create: `tests/lib/site.test.ts`
- Create: `src/data/site.json`
- Create: `src/lib/site.ts`
- Create: `src/content.config.ts`
- Create: `src/content/books/sanguo-scifi.json`
- Create: `src/content/chapters/sanguo-scifi-001-prologue.md`
- Create: `src/content/chapters/sanguo-scifi-002-huangjin.md`
- Create: `src/content/releases/sanguo-scifi-v0-1-0.md`
- Create: `src/content/prompts/rewrite-style-guide.md`
- Create: `public/favicon.svg`
- Create: `.pages.yml`

- [ ] **Step 1: Write the failing site-config test**

```ts
// tests/lib/site.test.ts
import { describe, expect, it } from "vitest";
import { getSiteConfig } from "../../src/lib/site";

describe("getSiteConfig", () => {
  it("returns the configured base site metadata", () => {
    const site = getSiteConfig();

    expect(site.title).toBe("MixTXT");
    expect(site.baseUrl).toBe("https://mixtxt.example.com");
    expect(site.author).toBe("matrix");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- --run tests/lib/site.test.ts`

Expected: FAIL with a module resolution error for `src/lib/site`

- [ ] **Step 3: Create the site config, collection schema, sample content, and CMS config**

```json
// src/data/site.json
{
  "title": "MixTXT",
  "description": "用 AI 改编经典小说的个人创作站。",
  "author": "matrix",
  "defaultLanguage": "zh-CN",
  "baseUrl": "https://mixtxt.example.com",
  "github": "https://github.com/a1pha3/mixtxt",
  "copyright": "本站只公开公版作品或已获得授权的改编内容。"
}
```

```ts
// src/lib/site.ts
import site from "../data/site.json";

export function getSiteConfig() {
  return site;
}
```

```ts
// src/content.config.ts
import { defineCollection, z } from "astro:content";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const chapterNoPattern = /^[0-9]{3}$/;

const seoSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional()
  })
  .optional();

const books = defineCollection({
  schema: z.object({
    title: z.string(),
    slug: z.string().regex(slugPattern),
    original: z.string().optional(),
    author: z.string().optional(),
    adaptor: z.string().optional(),
    status: z.enum(["planning", "serializing", "completed", "paused"]),
    visibility: z.enum(["public", "hidden"]),
    summary: z.string(),
    cover: z.string().optional(),
    tags: z.array(z.string()).default([]),
    copyrightStatus: z.enum(["public-domain", "authorized", "private-draft", "unknown"]),
    startedAt: z.string(),
    updatedAt: z.string(),
    seo: seoSchema
  })
});

const chapters = defineCollection({
  schema: z.object({
    book: z.string().regex(slugPattern),
    chapterNo: z.string().regex(chapterNoPattern),
    title: z.string(),
    slug: z.string().regex(slugPattern),
    status: z.enum(["draft", "review", "published", "archived"]),
    summary: z.string(),
    wordCount: z.number().int().nonnegative().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    ai: z
      .object({
        model: z.string().optional(),
        prompt: z.string().optional(),
        humanEdited: z.boolean().default(true)
      })
      .optional(),
    seo: seoSchema
  })
});

const releases = defineCollection({
  schema: z.object({
    book: z.string().regex(slugPattern),
    version: z.string(),
    versionSlug: z.string().regex(slugPattern),
    title: z.string(),
    date: z.string(),
    gitTag: z.string().optional()
  })
});

const prompts = defineCollection({
  schema: z.object({
    title: z.string(),
    slug: z.string().regex(slugPattern),
    category: z.enum(["rewrite", "style", "outline", "character", "review"]),
    status: z.enum(["active", "archived"]),
    updatedAt: z.string()
  })
});

export const collections = {
  books,
  chapters,
  releases,
  prompts
};
```

```json
// src/content/books/sanguo-scifi.json
{
  "title": "三国演义：星火纪元",
  "slug": "sanguo-scifi",
  "original": "三国演义",
  "author": "罗贯中",
  "adaptor": "matrix + AI",
  "status": "serializing",
  "visibility": "public",
  "summary": "把东汉末年的群雄割据改写成星际文明崩塌后的权力重组。",
  "cover": "/covers/sanguo-scifi.webp",
  "tags": ["三国", "科幻", "AI改编"],
  "copyrightStatus": "public-domain",
  "startedAt": "2026-06-03",
  "updatedAt": "2026-06-03",
  "seo": {
    "title": "三国演义：星火纪元",
    "description": "一个 AI 辅助改编的三国科幻版本。"
  }
}
```

```md
<!-- src/content/chapters/sanguo-scifi-001-prologue.md -->
---
book: "sanguo-scifi"
chapterNo: "001"
title: "楔子"
slug: "prologue"
status: "published"
summary: "旧帝国坠落后的第一束求救信号，从洛阳轨道井深处重新亮起。"
wordCount: 1800
createdAt: "2026-06-03"
updatedAt: "2026-06-03"
ai:
  model: "manual-or-ai-assisted"
  prompt: "rewrite-style-guide"
  humanEdited: true
seo:
  title: "楔子 - 三国演义：星火纪元"
  description: "旧帝国坠落后，洛阳轨道井重新亮起求救信号。"
---

洛阳轨道井停摆后的第七年，第一枚求救信标从废弃电梯井深处升起。
```

```md
<!-- src/content/chapters/sanguo-scifi-002-huangjin.md -->
---
book: "sanguo-scifi"
chapterNo: "002"
title: "黄巾初起"
slug: "huangjin"
status: "published"
summary: "巨鹿星区的张角点燃第一枚信标，旧帝国的边境开始瓦解。"
wordCount: 3200
createdAt: "2026-06-03"
updatedAt: "2026-06-03"
ai:
  model: "manual-or-ai-assisted"
  prompt: "rewrite-style-guide"
  humanEdited: true
seo:
  title: "黄巾初起 - 三国演义：星火纪元"
  description: "巨鹿星区起事，帝国边境开始瓦解。"
---

巨鹿星区的夜空没有月亮，只有一圈报废轨道炮留下的蓝白色残光。
```

```md
<!-- src/content/releases/sanguo-scifi-v0-1-0.md -->
---
book: "sanguo-scifi"
version: "v0.1.0"
versionSlug: "v0-1-0"
title: "前三章试读版"
date: "2026-06-03"
gitTag: "v0.1.0"
---

这一版完成了世界观设定、楔子和黄巾初起两章。
```

```md
<!-- src/content/prompts/rewrite-style-guide.md -->
---
title: "经典小说科幻改写提示词"
slug: "rewrite-style-guide"
category: "rewrite"
status: "active"
updatedAt: "2026-06-03"
---

你是一名严肃文学改编作者。请保留原作人物关系和核心冲突，但把时代背景改写为星际文明衰退期。
```

```svg
<!-- public/favicon.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#111827"/>
  <path d="M18 16h10l8 15 8-15h10L37 48h-10z" fill="#f9fafb"/>
</svg>
```

```yaml
# .pages.yml
media:
  - name: covers
    label: Covers
    input: public/covers
    output: /covers
    rename: safe
    extensions: [jpg, jpeg, png, webp]

content:
  - name: site
    label: 网站设置
    type: file
    path: src/data/site.json
    format: json
    fields:
      - { name: title, label: 网站名称, type: string, required: true }
      - { name: description, label: 网站描述, type: text, required: true }
      - { name: author, label: 作者, type: string, required: true }
      - { name: defaultLanguage, label: 默认语言, type: string }
      - { name: baseUrl, label: 站点地址, type: string, required: true }
      - { name: github, label: GitHub 地址, type: string }
      - { name: copyright, label: 版权说明, type: text }

  - name: books
    label: 书籍
    type: collection
    path: src/content/books
    format: json
    filename: "{slug}.json"
    fields:
      - { name: title, label: 书名, type: string, required: true }
      - { name: slug, label: Slug, type: string, required: true }
      - { name: original, label: 原作, type: string }
      - { name: author, label: 原作作者, type: string }
      - { name: adaptor, label: 改编者, type: string }
      - { name: status, label: 连载状态, type: string, required: true }
      - { name: visibility, label: 可见性, type: string, required: true }
      - { name: summary, label: 简介, type: text, required: true }
      - { name: cover, label: 封面, type: image, options: { media: covers } }
      - { name: tags, label: 标签, type: string, options: { multiple: true } }
      - { name: copyrightStatus, label: 版权状态, type: string, required: true }
      - { name: startedAt, label: 开始日期, type: date, required: true }
      - { name: updatedAt, label: 更新日期, type: date, required: true }

  - name: chapters
    label: 章节
    type: collection
    path: src/content/chapters
    format: yaml-frontmatter
    filename: "{book}-{chapterNo}-{slug}.md"
    fields:
      - { name: book, label: 所属书籍, type: string, required: true }
      - { name: chapterNo, label: 章节号, type: string, required: true }
      - { name: title, label: 章节标题, type: string, required: true }
      - { name: slug, label: Slug, type: string, required: true }
      - { name: status, label: 状态, type: string, required: true }
      - { name: summary, label: 摘要, type: text, required: true }
      - { name: createdAt, label: 创建日期, type: date, required: true }
      - { name: updatedAt, label: 更新日期, type: date, required: true }
      - { name: body, label: 正文, type: rich-text, required: true, options: { format: markdown } }

  - name: releases
    label: 版本说明
    type: collection
    path: src/content/releases
    format: yaml-frontmatter
    filename: "{book}-{versionSlug}.md"
    fields:
      - { name: book, label: 所属书籍, type: string, required: true }
      - { name: version, label: 版本号, type: string, required: true }
      - { name: versionSlug, label: 版本 Slug, type: string, required: true }
      - { name: title, label: 标题, type: string, required: true }
      - { name: date, label: 日期, type: date, required: true }
      - { name: gitTag, label: Git 标签, type: string }
      - { name: body, label: 正文, type: rich-text, required: true, options: { format: markdown } }

  - name: prompts
    label: 提示词模板
    type: collection
    path: src/content/prompts
    format: yaml-frontmatter
    filename: "{slug}.md"
    fields:
      - { name: title, label: 标题, type: string, required: true }
      - { name: slug, label: Slug, type: string, required: true }
      - { name: category, label: 分类, type: string, required: true }
      - { name: status, label: 状态, type: string, required: true }
      - { name: updatedAt, label: 更新日期, type: date, required: true }
      - { name: body, label: 正文, type: rich-text, required: true, options: { format: markdown } }
```

- [ ] **Step 4: Verify the site helper and schema baseline**

Run: `npm run test -- --run tests/lib/site.test.ts && npm run check`

Expected: the site test passes and `astro check` exits successfully

- [ ] **Step 5: Commit the content and CMS skeleton**

```bash
git add tests/lib/site.test.ts src/data/site.json src/lib/site.ts src/content.config.ts src/content public/favicon.svg .pages.yml
git commit -m "feat: add content schema and CMS skeleton"
```

### Task 3: Build The Shared Public Content Query Layer

**Files:**
- Create: `tests/lib/content.test.ts`
- Create: `src/lib/content.ts`

- [ ] **Step 1: Write the failing tests for public filtering and chapter navigation**

```ts
// tests/lib/content.test.ts
import { describe, expect, it } from "vitest";
import {
  buildChapterNav,
  filterPublicBooks,
  filterPublishedChapters,
  findPublicBookBySlug
} from "../../src/lib/content";

const books = [
  { id: "books/public.json", data: { slug: "public-book", visibility: "public", updatedAt: "2026-06-04", tags: ["A"] } },
  { id: "books/hidden.json", data: { slug: "hidden-book", visibility: "hidden", updatedAt: "2026-06-05", tags: ["B"] } }
] as const;

const chapters = [
  { id: "chapters/public-001.md", data: { book: "public-book", chapterNo: "001", slug: "one", status: "published", updatedAt: "2026-06-03" } },
  { id: "chapters/public-002.md", data: { book: "public-book", chapterNo: "002", slug: "two", status: "published", updatedAt: "2026-06-04" } },
  { id: "chapters/public-003.md", data: { book: "public-book", chapterNo: "003", slug: "draft", status: "draft", updatedAt: "2026-06-05" } },
  { id: "chapters/hidden-001.md", data: { book: "hidden-book", chapterNo: "001", slug: "hidden", status: "published", updatedAt: "2026-06-05" } }
] as const;

describe("content query helpers", () => {
  it("keeps only public books sorted by updatedAt descending", () => {
    expect(filterPublicBooks(books).map((book) => book.data.slug)).toEqual(["public-book"]);
  });

  it("finds a public book by slug", () => {
    expect(findPublicBookBySlug(books, "public-book")?.id).toBe("books/public.json");
    expect(findPublicBookBySlug(books, "hidden-book")).toBeUndefined();
  });

  it("keeps only published chapters under public books", () => {
    expect(
      filterPublishedChapters(chapters, books).map((chapter) => `${chapter.data.book}:${chapter.data.slug}`)
    ).toEqual(["public-book:one", "public-book:two"]);
  });

  it("builds previous and next chapter links inside a book", () => {
    const nav = buildChapterNav(chapters, books, "public-book", "two");

    expect(nav.current?.data.slug).toBe("two");
    expect(nav.prev?.data.slug).toBe("one");
    expect(nav.next).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- --run tests/lib/content.test.ts`

Expected: FAIL with a module resolution error for `src/lib/content`

- [ ] **Step 3: Implement the shared query layer**

```ts
// src/lib/content.ts
import { getCollection } from "astro:content";

type Visibility = "public" | "hidden";
type ChapterStatus = "draft" | "review" | "published" | "archived";

export type BookEntryLike = {
  id: string;
  data: {
    slug: string;
    visibility: Visibility;
    updatedAt: string;
    tags?: string[];
  };
};

export type ChapterEntryLike = {
  id: string;
  data: {
    book: string;
    chapterNo: string;
    slug: string;
    status: ChapterStatus;
    updatedAt: string;
  };
};

export function filterPublicBooks<T extends BookEntryLike>(books: readonly T[]) {
  return [...books]
    .filter((book) => book.data.visibility === "public")
    .sort((a, b) => b.data.updatedAt.localeCompare(a.data.updatedAt));
}

export function findPublicBookBySlug<T extends BookEntryLike>(books: readonly T[], slug: string) {
  return filterPublicBooks(books).find((book) => book.data.slug === slug);
}

export function filterPublishedChapters<T extends ChapterEntryLike>(
  chapters: readonly T[],
  books?: readonly BookEntryLike[],
  bookSlug?: string
) {
  const publicBookSlugs = new Set((books ? filterPublicBooks(books) : []).map((book) => book.data.slug));

  return [...chapters]
    .filter((chapter) => chapter.data.status === "published")
    .filter((chapter) => (books ? publicBookSlugs.has(chapter.data.book) : true))
    .filter((chapter) => (bookSlug ? chapter.data.book === bookSlug : true))
    .sort((a, b) => a.data.chapterNo.localeCompare(b.data.chapterNo));
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

export async function getPublicBooks() {
  const books = await getCollection("books");
  return filterPublicBooks(books);
}

export async function getBookBySlug(slug: string) {
  const books = await getCollection("books");
  return findPublicBookBySlug(books, slug) ?? null;
}

export async function getPublishedChapters(bookSlug?: string) {
  const [books, chapters] = await Promise.all([getCollection("books"), getCollection("chapters")]);
  return filterPublishedChapters(chapters, books, bookSlug);
}

export async function getRecentChapters(limit = 10) {
  const chapters = await getPublishedChapters();
  return [...chapters]
    .sort((a, b) => b.data.updatedAt.localeCompare(a.data.updatedAt))
    .slice(0, limit);
}

export async function getChapterNav(bookSlug: string, chapterSlug: string) {
  const [books, chapters] = await Promise.all([getCollection("books"), getCollection("chapters")]);
  return buildChapterNav(chapters, books, bookSlug, chapterSlug);
}

export async function getAllTags() {
  const books = await getPublicBooks();
  return [...new Set(books.flatMap((book) => book.data.tags ?? []))].sort((a, b) => a.localeCompare(b));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- --run tests/lib/content.test.ts`

Expected: PASS with `4 passed`

- [ ] **Step 5: Commit the query layer**

```bash
git add tests/lib/content.test.ts src/lib/content.ts
git commit -m "feat: add public content query helpers"
```

### Task 4: Implement Content Validation With Fixture-Driven Tests

**Files:**
- Create: `tests/scripts/validate-content.test.ts`
- Create: `tests/fixtures/valid/src/data/site.json`
- Create: `tests/fixtures/valid/src/content/books/book.json`
- Create: `tests/fixtures/valid/src/content/chapters/book-001-start.md`
- Create: `tests/fixtures/invalid-hidden-book/src/data/site.json`
- Create: `tests/fixtures/invalid-hidden-book/src/content/books/book.json`
- Create: `tests/fixtures/invalid-hidden-book/src/content/chapters/book-001-start.md`
- Create: `scripts/validate-content.mjs`

- [ ] **Step 1: Write the failing validation tests**

```ts
// tests/scripts/validate-content.test.ts
import { describe, expect, it } from "vitest";
import path from "node:path";
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
    ).resolves.toContain("Published chapter book-001-start.md belongs to non-public book \"book\".");
  });
});
```

```json
// tests/fixtures/valid/src/data/site.json
{
  "title": "MixTXT",
  "description": "fixture",
  "author": "matrix",
  "defaultLanguage": "zh-CN",
  "baseUrl": "https://mixtxt.example.com",
  "github": "https://example.com/repo",
  "copyright": "fixture"
}
```

```json
// tests/fixtures/valid/src/content/books/book.json
{
  "title": "Fixture Book",
  "slug": "book",
  "status": "serializing",
  "visibility": "public",
  "summary": "fixture",
  "tags": [],
  "copyrightStatus": "public-domain",
  "startedAt": "2026-06-01",
  "updatedAt": "2026-06-01"
}
```

```md
<!-- tests/fixtures/valid/src/content/chapters/book-001-start.md -->
---
book: "book"
chapterNo: "001"
title: "Start"
slug: "start"
status: "published"
summary: "fixture"
createdAt: "2026-06-01"
updatedAt: "2026-06-01"
---

Fixture body.
```

```json
// tests/fixtures/invalid-hidden-book/src/data/site.json
{
  "title": "MixTXT",
  "description": "fixture",
  "author": "matrix",
  "defaultLanguage": "zh-CN",
  "baseUrl": "https://mixtxt.example.com",
  "github": "https://example.com/repo",
  "copyright": "fixture"
}
```

```json
// tests/fixtures/invalid-hidden-book/src/content/books/book.json
{
  "title": "Hidden Fixture Book",
  "slug": "book",
  "status": "serializing",
  "visibility": "hidden",
  "summary": "fixture",
  "tags": [],
  "copyrightStatus": "private-draft",
  "startedAt": "2026-06-01",
  "updatedAt": "2026-06-01"
}
```

```md
<!-- tests/fixtures/invalid-hidden-book/src/content/chapters/book-001-start.md -->
---
book: "book"
chapterNo: "001"
title: "Start"
slug: "start"
status: "published"
summary: "fixture"
createdAt: "2026-06-01"
updatedAt: "2026-06-01"
---

Fixture body.
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- --run tests/scripts/validate-content.test.ts`

Expected: FAIL because `validateProjectContent` is not exported from `scripts/validate-content.mjs`

- [ ] **Step 3: Implement the validation script**

```js
// scripts/validate-content.mjs
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

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- --run tests/scripts/validate-content.test.ts`

Expected: PASS with `2 passed`

- [ ] **Step 5: Commit the validation workflow**

```bash
git add tests/scripts/validate-content.test.ts tests/fixtures scripts/validate-content.mjs
git commit -m "feat: add content validation script"
```

### Task 5: Add Reader Preference Helpers

**Files:**
- Create: `tests/lib/reading.test.ts`
- Create: `src/lib/reading.ts`

- [ ] **Step 1: Write the failing tests for reader preferences**

```ts
// tests/lib/reading.test.ts
import { describe, expect, it } from "vitest";
import {
  defaultReaderPreferences,
  mergeReaderPreferences,
  sanitizeReaderPreferences
} from "../../src/lib/reading";

describe("reader preferences", () => {
  it("provides stable defaults", () => {
    expect(defaultReaderPreferences.theme).toBe("system");
    expect(defaultReaderPreferences.fontSize).toBe(18);
  });

  it("sanitizes invalid persisted values", () => {
    expect(
      sanitizeReaderPreferences({
        theme: "neon",
        fontSize: 4,
        lineHeight: 9
      })
    ).toEqual(defaultReaderPreferences);
  });

  it("merges a partial user override", () => {
    expect(mergeReaderPreferences({ fontSize: 20 }).fontSize).toBe(20);
    expect(mergeReaderPreferences({ fontSize: 20 }).theme).toBe("system");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- --run tests/lib/reading.test.ts`

Expected: FAIL with a module resolution error for `src/lib/reading`

- [ ] **Step 3: Implement the reader preference helpers**

```ts
// src/lib/reading.ts
export type ReaderTheme = "system" | "light" | "dark";

export type ReaderPreferences = {
  theme: ReaderTheme;
  fontSize: number;
  lineHeight: number;
};

export const defaultReaderPreferences: ReaderPreferences = {
  theme: "system",
  fontSize: 18,
  lineHeight: 1.8
};

export function sanitizeReaderPreferences(input: Partial<ReaderPreferences> | null | undefined): ReaderPreferences {
  const theme = input?.theme;
  const fontSize = input?.fontSize;
  const lineHeight = input?.lineHeight;

  return {
    theme: theme === "light" || theme === "dark" || theme === "system" ? theme : defaultReaderPreferences.theme,
    fontSize: typeof fontSize === "number" && fontSize >= 14 && fontSize <= 24 ? fontSize : defaultReaderPreferences.fontSize,
    lineHeight:
      typeof lineHeight === "number" && lineHeight >= 1.5 && lineHeight <= 2.2
        ? lineHeight
        : defaultReaderPreferences.lineHeight
  };
}

export function mergeReaderPreferences(input: Partial<ReaderPreferences> | null | undefined) {
  return sanitizeReaderPreferences({
    ...defaultReaderPreferences,
    ...input
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- --run tests/lib/reading.test.ts`

Expected: PASS with `3 passed`

- [ ] **Step 5: Commit the reader helpers**

```bash
git add tests/lib/reading.test.ts src/lib/reading.ts
git commit -m "feat: add reader preference helpers"
```

### Task 6: Build The Public Pages, Layouts, Components, And Route Smoke Tests

**Files:**
- Create: `tests/build/routes.test.ts`
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/layouts/BookLayout.astro`
- Create: `src/layouts/ReaderLayout.astro`
- Create: `src/components/AppHeader.astro`
- Create: `src/components/AppFooter.astro`
- Create: `src/components/BookCard.astro`
- Create: `src/components/ChapterList.astro`
- Create: `src/components/ChapterNav.astro`
- Create: `src/pages/index.astro`
- Create: `src/pages/books/[book].astro`
- Create: `src/pages/books/[book]/[chapter].astro`
- Create: `src/pages/404.astro`
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/styles/reader.css`

- [ ] **Step 1: Write the failing build-route smoke tests**

```ts
// tests/build/routes.test.ts
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const distDir = path.resolve("dist");

describe("built routes", () => {
  beforeAll(() => {
    execSync("npm run build", { stdio: "pipe" });
  });

  it("builds the homepage", () => {
    const html = fs.readFileSync(path.join(distDir, "index.html"), "utf8");
    expect(html).toContain("MixTXT");
    expect(html).toContain("三国演义：星火纪元");
  });

  it("builds the book page", () => {
    const html = fs.readFileSync(path.join(distDir, "books", "sanguo-scifi", "index.html"), "utf8");
    expect(html).toContain("三国演义：星火纪元");
    expect(html).toContain("黄巾初起");
  });

  it("builds the chapter page", () => {
    const html = fs.readFileSync(path.join(distDir, "books", "sanguo-scifi", "huangjin", "index.html"), "utf8");
    expect(html).toContain("黄巾初起");
    expect(html).toContain("巨鹿星区的夜空没有月亮");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- --run tests/build/routes.test.ts`

Expected: FAIL because the required routes and built files do not exist yet

- [ ] **Step 3: Implement the layouts, components, styles, and pages**

```astro
--- 
// src/layouts/BaseLayout.astro
import { getSiteConfig } from "../lib/site";
import "../styles/global.css";

interface Props {
  title?: string;
  description?: string;
}

const site = getSiteConfig();
const { title = site.title, description = site.description } = Astro.props;
---

<!doctype html>
<html lang={site.defaultLanguage}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={description} />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>{title}</title>
  </head>
  <body>
    <slot />
  </body>
</html>
```

```astro
---
// src/layouts/BookLayout.astro
import BaseLayout from "./BaseLayout.astro";
import AppFooter from "../components/AppFooter.astro";
import AppHeader from "../components/AppHeader.astro";

const { title, summary } = Astro.props;
---

<BaseLayout title={title} description={summary}>
  <AppHeader />
  <main class="page-shell">
    <slot />
  </main>
  <AppFooter />
</BaseLayout>
```

```astro
---
// src/layouts/ReaderLayout.astro
import BaseLayout from "./BaseLayout.astro";
import AppHeader from "../components/AppHeader.astro";
import AppFooter from "../components/AppFooter.astro";
import "../styles/reader.css";

const { title, description } = Astro.props;
---

<BaseLayout title={title} description={description}>
  <AppHeader />
  <main class="reader-shell">
    <slot />
  </main>
  <AppFooter />
</BaseLayout>
```

```astro
---
// src/components/AppHeader.astro
---

<header class="site-header">
  <div class="page-shell site-header__inner">
    <a class="site-brand" href="/">MixTXT</a>
    <nav class="site-nav">
      <a href="/">首页</a>
    </nav>
  </div>
</header>
```

```astro
---
// src/components/AppFooter.astro
import { getSiteConfig } from "../lib/site";

const site = getSiteConfig();
---

<footer class="site-footer">
  <div class="page-shell">
    <p>{site.copyright}</p>
  </div>
</footer>
```

```astro
---
// src/components/BookCard.astro
const { book } = Astro.props;
---

<article class="book-card">
  <a href={`/books/${book.data.slug}/`}>
    <h2>{book.data.title}</h2>
    <p>{book.data.summary}</p>
  </a>
</article>
```

```astro
---
// src/components/ChapterList.astro
const { chapters } = Astro.props;
---

<ol class="chapter-list">
  {chapters.map((chapter) => (
    <li>
      <a href={`/books/${chapter.data.book}/${chapter.data.slug}/`}>
        <span>{chapter.data.chapterNo}</span>
        <strong>{chapter.data.title}</strong>
      </a>
    </li>
  ))}
</ol>
```

```astro
---
// src/components/ChapterNav.astro
const { prev, next } = Astro.props;
---

<nav class="chapter-nav" aria-label="章节导航">
  {prev ? <a href={`/books/${prev.data.book}/${prev.data.slug}/`}>上一章：{prev.data.title}</a> : <span>已是第一章</span>}
  {next ? <a href={`/books/${next.data.book}/${next.data.slug}/`}>下一章：{next.data.title}</a> : <span>已是最后一章</span>}
</nav>
```

```astro
---
// src/pages/index.astro
import AppFooter from "../components/AppFooter.astro";
import AppHeader from "../components/AppHeader.astro";
import BookCard from "../components/BookCard.astro";
import BaseLayout from "../layouts/BaseLayout.astro";
import { getPublicBooks, getRecentChapters } from "../lib/content";

const books = await getPublicBooks();
const recentChapters = await getRecentChapters(5);
---

<BaseLayout>
  <AppHeader />
  <main class="page-shell home-grid">
    <section class="hero-block">
      <h1>MixTXT</h1>
      <p>用 AI 改编经典小说的个人创作站。</p>
    </section>

    <section>
      <h2>书籍</h2>
      <div class="book-grid">
        {books.map((book) => <BookCard book={book} />)}
      </div>
    </section>

    <section>
      <h2>最近更新</h2>
      <ul class="recent-list">
        {recentChapters.map((chapter) => (
          <li>
            <a href={`/books/${chapter.data.book}/${chapter.data.slug}/`}>
              {chapter.data.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  </main>
  <AppFooter />
</BaseLayout>
```

```astro
---
// src/pages/books/[book].astro
import BookLayout from "../../layouts/BookLayout.astro";
import ChapterList from "../../components/ChapterList.astro";
import { getBookBySlug, getPublicBooks, getPublishedChapters } from "../../lib/content";

export async function getStaticPaths() {
  const books = await getPublicBooks();
  return books.map((book) => ({
    params: { book: book.data.slug }
  }));
}

const { book: bookSlug } = Astro.params;
const book = await getBookBySlug(bookSlug!);

if (!book) {
  return Astro.redirect("/404");
}

const chapters = await getPublishedChapters(book.data.slug);
---

<BookLayout title={book.data.title} summary={book.data.summary}>
  <article class="book-page">
    <p class="eyebrow">{book.data.status}</p>
    <h1>{book.data.title}</h1>
    <p>{book.data.summary}</p>
    <ChapterList chapters={chapters} />
  </article>
</BookLayout>
```

```astro
---
// src/pages/books/[book]/[chapter].astro
import ChapterNav from "../../../components/ChapterNav.astro";
import ReaderLayout from "../../../layouts/ReaderLayout.astro";
import { defaultReaderPreferences } from "../../../lib/reading";
import { getChapterNav, getPublicBooks, getPublishedChapters } from "../../../lib/content";

export async function getStaticPaths() {
  const books = await getPublicBooks();
  const entries = await Promise.all(
    books.map(async (book) => {
      const chapters = await getPublishedChapters(book.data.slug);
      return chapters.map((chapter) => ({
        params: { book: book.data.slug, chapter: chapter.data.slug }
      }));
    })
  );

  return entries.flat();
}

const { book, chapter } = Astro.params;
const nav = await getChapterNav(book!, chapter!);

if (!nav.current) {
  return Astro.redirect("/404");
}

const { Content } = await nav.current.render();
---

<ReaderLayout title={nav.current.data.title} description={nav.current.data.summary}>
  <article class="reader-page" data-theme={defaultReaderPreferences.theme}>
    <header class="reader-header">
      <p class="eyebrow">{nav.current.data.book}</p>
      <h1>{nav.current.data.title}</h1>
    </header>
    <div class="reader-body">
      <Content />
    </div>
    <ChapterNav prev={nav.prev} next={nav.next} />
  </article>
</ReaderLayout>
```

```astro
---
// src/pages/404.astro
import BaseLayout from "../layouts/BaseLayout.astro";
---

<BaseLayout title="404 | MixTXT">
  <main class="page-shell not-found">
    <h1>页面不存在</h1>
    <p>这个页面还没有抵达这个宇宙。</p>
    <a href="/">返回首页</a>
  </main>
</BaseLayout>
```

```css
/* src/styles/tokens.css */
:root {
  --bg: #f5f7fb;
  --surface: #ffffff;
  --text: #111827;
  --muted: #4b5563;
  --line: #dbe2ea;
  --accent: #1d4ed8;
  --max-width: 72rem;
}
```

```css
/* src/styles/global.css */
@import "./tokens.css";

* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--text);
}
a { color: inherit; text-decoration: none; }
.page-shell { width: min(calc(100% - 32px), var(--max-width)); margin: 0 auto; }
.site-header, .site-footer { background: var(--surface); border-bottom: 1px solid var(--line); }
.site-footer { border-top: 1px solid var(--line); border-bottom: 0; padding: 24px 0; }
.site-header__inner { display: flex; align-items: center; justify-content: space-between; min-height: 64px; }
.home-grid, .book-page, .not-found { padding: 32px 0 48px; }
.hero-block, .book-card, .chapter-list li, .reader-page {
  background: var(--surface);
  border: 1px solid var(--line);
}
.hero-block, .book-card, .book-page, .reader-page, .not-found { padding: 24px; }
.book-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
.chapter-list { list-style: none; padding: 0; margin: 24px 0 0; }
.chapter-list li { margin-bottom: 12px; padding: 16px; }
.recent-list { padding-left: 18px; }
.eyebrow { color: var(--muted); text-transform: uppercase; font-size: 0.8rem; }
```

```css
/* src/styles/reader.css */
.reader-shell { padding: 32px 0 56px; }
.reader-page { width: min(calc(100% - 32px), 52rem); margin: 0 auto; }
.reader-header { margin-bottom: 24px; }
.reader-body { font-size: 1.125rem; line-height: 1.8; }
.chapter-nav { display: flex; justify-content: space-between; gap: 16px; margin-top: 32px; }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- --run tests/build/routes.test.ts`

Expected: PASS with `3 passed`

- [ ] **Step 5: Commit the public UI**

```bash
git add tests/build/routes.test.ts src/layouts src/components src/pages src/styles
git commit -m "feat: build MixTXT reading foundation"
```

### Task 7: Run The Full Verification Sweep

**Files:**
- Modify: `package-lock.json` if dependency graph changed during prior tasks

- [ ] **Step 1: Run all tests**

Run: `npm run test -- --run`

Expected: PASS with the site, content, validation, reading, and route tests all green

- [ ] **Step 2: Run type and Astro validation**

Run: `npm run check`

Expected: PASS with no type or Astro content errors

- [ ] **Step 3: Run content validation directly**

Run: `npm run validate:content`

Expected: `Content validation passed.`

- [ ] **Step 4: Run the production build**

Run: `npm run build`

Expected: `Content validation passed.` followed by a successful Astro build that writes `dist/`

- [ ] **Step 5: Commit the verified foundation**

```bash
git add package-lock.json
git commit -m "chore: verify MixTXT foundation build"
```
