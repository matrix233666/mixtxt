# MixTXT Reader Experience Design

## Overview

This spec defines the third MixTXT implementation subproject.

The first subproject established the static content foundation:

- typed content structure
- public filtering rules
- validation workflow
- homepage, book page, chapter page, and 404
- CMS-ready repository layout

The second subproject added discovery and distribution:

- static search
- tag browsing
- public releases page
- RSS
- sitemap

The third subproject should now improve the core reading flow itself.

It focuses on the difference between "a site that can display chapters" and "a site that feels good to read for a long time."

## Subproject Goal

Deliver a stronger reader-facing experience that supports:

- a complete top-level public navigation
- a dedicated books index page
- a dedicated about page
- richer book detail presentation
- a practical chapter reader toolbar
- persisted reading preferences in `localStorage`
- per-book "continue reading" entry points
- a chapter-directory drawer pattern that works on mobile and desktop

This subproject should preserve the project's static-first model:

- no database
- no user accounts
- no runtime backend
- no client-side framework requirement beyond small progressive enhancement scripts

## In Scope

This subproject includes:

1. expanding the global navigation to reflect the real public site structure
2. adding `/books/` as a dedicated public books index
3. adding `/about/` as a project and copyright boundary page
4. enriching `/books/[book]/` with:
   - better metadata presentation
   - a primary "start reading" action
   - a "continue reading" action when a saved chapter exists
   - recent release visibility
5. upgrading `/books/[book]/[chapter]/` with:
   - a reader toolbar
   - theme, font size, line height, and width settings
   - chapter directory access
   - saved last-read chapter tracking
   - explicit reader metadata presentation
6. extending `src/lib/reading.ts` so reading preferences and progress share one consistent shape
7. adding reader-focused styling and mobile behavior
8. adding build tests for the new public routes and reader output structure

## Out Of Scope

This subproject does not include:

- Pages CMS configuration expansion
- Cloudflare Pages deployment work
- analytics
- bookmarks synchronized across devices
- comments, likes, or collections
- public prompt pages
- advanced SEO/Open Graph expansion
- search UX redesign
- multi-book faceted browsing
- reader annotations
- runtime user state

These belong to later subprojects.

## Product Boundary

MixTXT remains a single-author, public-reading, static site.

The reading experience can become more polished, but it must stay operationally simple:

- preferences live in the browser only
- chapter progress is remembered locally only
- public pages remain fully build-time generated

The reader experience layer must not introduce any requirement for server storage or authenticated sessions.

## Reader Journey

After this subproject, the main public reading path should be:

1. homepage
2. books index
3. book detail page
4. chapter page
5. next chapter or return to directory

Supporting jumps should also exist:

1. top navigation to books, search, about
2. continue-reading links from homepage and book page when local progress exists
3. chapter directory access from inside the reader

The public path should feel coherent on both desktop and mobile without turning the site into an app shell.

## Information Architecture

After this subproject, the public site structure should be:

- `/`
- `/books/`
- `/books/[book]/`
- `/books/[book]/[chapter]/`
- `/search/`
- `/tags/[tag]/`
- `/releases/`
- `/about/`
- `/rss.xml`
- `/sitemap.xml`

This subproject adds only the missing reader-adjacent public destinations:

- `/books/`
- `/about/`

It also upgrades existing book and chapter pages rather than creating parallel reader routes.

## Design Principles

### 1. Reading Comfort Over Decoration

The reader should feel calm, dense enough to scan, and stable across long sessions.

Large decorative hero treatments, oversized cards, or marketing-style compositions are out of scope for this product.

### 2. Progressive Enhancement

The chapter page must remain readable without client-side JavaScript.

JavaScript should enhance:

- preference controls
- continue-reading behavior
- directory drawer interactions

But it must not become required to render chapter content.

### 3. Shared Reader State Rules

Preference parsing, defaults, and storage keys must be centralized.

Pages and components should not each invent their own `localStorage` format.

### 4. Reader Actions Should Follow Existing Content Rules

Continue-reading links and chapter directory surfaces must only point to already-public chapters.

The reader layer must not bypass the public filtering logic built in earlier subprojects.

## Route Responsibilities

### Homepage `/`

The homepage should remain editorially light, but it should gain one reader-oriented improvement:

- where local progress exists, expose a compact continue-reading section above or near recent updates

It should still show:

- public books
- recent updates
- tag links
- search/release entry points

### Books Index `/books/`

This page is responsible for:

- listing all public books in one dedicated place
- supporting light client-side sorting and filtering

For the first version of this route, filters should stay intentionally simple:

- status filter
- tag filter
- sort by recent update, title, or completion state

No server-side filtering logic is needed.

### Book Detail `/books/[book]/`

This page should expand from a minimal chapter list into a stronger reading launch point.

It should present:

- cover when available
- title
- original work and adaptor metadata when available
- summary
- status badge
- copyright status
- tags
- chapter list
- recent public releases for that book
- start-reading action
- continue-reading action when a saved chapter exists and is still public

### Chapter Page `/books/[book]/[chapter]/`

This page is the center of the subproject.

It should present:

- chapter title
- summary
- update date
- optional word count when present
- return-to-book link
- chapter directory access
- reading controls
- the chapter body with `data-pagefind-body`
- previous/next chapter navigation

The reading toolbar should support:

- theme: `system`, `light`, `dark`
- font size: `small`, `medium`, `large`
- line height: `compact`, `standard`, `relaxed`
- width: `standard`, `wide`

The UI labels can remain simple, but the underlying state should use stable storage values.

### About Page `/about/`

This page should explain:

- what MixTXT is
- how AI is used in the writing workflow
- the copyright boundary for public content
- how to reach the project or repository

It should remain a quiet informational page, not a landing page.

## Reader State Design

Reader state should be split into two concerns:

1. preferences shared across all books
2. last-read chapter per book

### Preference Storage

Stable storage keys:

- `mixtxt.reader.theme`
- `mixtxt.reader.fontSize`
- `mixtxt.reader.lineHeight`
- `mixtxt.reader.width`

### Progress Storage

Stable storage key pattern:

- `mixtxt.reader.lastChapter.{bookSlug}`

Stored value format:

- `{bookSlug}/{chapterSlug}`

The client should treat invalid or stale values as absent and fail quietly.

### Preference Model

`src/lib/reading.ts` should own:

- default values
- allowed enum values
- sanitization
- helpers for reading and writing the shared state shape

The library should move from raw numeric-only settings toward a more explicit preset model that maps cleanly to UI controls and CSS data attributes.

## Component And File Impact

This subproject is expected to extend the current structure with files such as:

```text
src/
├── components/
│   ├── BookMeta.astro
│   ├── ReaderToolbar.astro
│   ├── TagList.astro
│   └── VersionBadge.astro
├── lib/
│   ├── content.ts
│   └── reading.ts
├── pages/
│   ├── about.astro
│   └── books/
│       └── index.astro
└── styles/
    ├── global.css
    └── reader.css
```

Exact filenames may flex slightly if the existing code patterns suggest a better fit, but these responsibilities should remain stable.

## Shared Content Layer Extensions

The shared content layer should be extended rather than bypassed.

Expected additions include helpers such as:

- `getPublicBooksByTag(tag)`
- `getPublicReleasesByBook(bookSlug)`
- `getBookStartChapter(bookSlug)`
- `getPublicChapterBySlug(bookSlug, chapterSlug)`

Book pages and reader pages should consume these helpers instead of hand-rolling local filtering.

## Component Responsibilities

### `AppHeader.astro`

Expand the navigation to include:

- home
- books
- search
- about

The header should stay compact and scan-friendly.

### `BookCard.astro`

It should become a richer summary card with:

- title
- summary
- status badge
- tags
- updated date

It should still remain lightweight enough for grids.

### `BookMeta.astro`

This component should render structured book metadata consistently across the books index and book detail page.

### `ChapterList.astro`

It should continue to list public chapters, but it should support:

- clearer numbering
- metadata alignment
- optional highlighting for the saved continue-reading chapter

### `ReaderToolbar.astro`

This component should own the client-side controls for:

- theme
- font size
- line height
- width
- directory toggle

It should write to `localStorage` and apply `data-` attributes to the reader root or document element.

### `ChapterNav.astro`

This component can keep its basic responsibility, but its presentation should better match the upgraded reader layout and handle missing neighbors clearly.

## Styling Strategy

### Global Styles

`src/styles/global.css` should absorb:

- stronger navigation styling
- books index layout
- about-page typography
- richer book-card and metadata presentation

### Reader Styles

`src/styles/reader.css` should own:

- reader width presets
- font-size presets
- line-height presets
- chapter drawer behavior
- toolbar layout
- mobile-specific reader spacing

Reader layout shifts should be prevented by using fixed control dimensions where appropriate.

## Mobile Design

Mobile behavior is a first-class requirement in this subproject.

The chapter page should ensure:

- controls do not cover the text body
- the chapter directory is available via a toggle, not a permanently open sidebar
- line length remains comfortable
- toolbar controls wrap cleanly without overlapping

The books index and book detail page should also remain readable with dense but stable spacing.

## Accessibility Boundary

The upgraded reader should preserve baseline accessibility:

- semantic headings
- labeled controls
- keyboard-focus visibility
- usable buttons for toolbar and directory toggle
- no reliance on color alone to communicate state

This subproject does not require a full accessibility audit, but it should not regress baseline keyboard or screen-reader usability.

## Testing Strategy

Testing for this subproject should cover four areas.

### 1. Public Route Output

Verify the build produces:

- `/books/index.html`
- `/about/index.html`

And that these routes contain expected public content.

### 2. Reader Structure

Verify chapter pages include:

- the upgraded toolbar container
- `data-pagefind-body`
- previous/next navigation
- return-to-book link

### 3. Shared Reader State Logic

Unit-test `src/lib/reading.ts` for:

- default values
- sanitization of invalid themes or presets
- sanitization of invalid progress values

### 4. Public Progress Safety

Verify continue-reading output does not create broken links when a stored chapter is missing or no longer public.

This can be covered with client-safe fallbacks and build-time tests around chapter availability helpers.

## Delivery Sequence

Implementation planning should follow this order:

1. extend the reading-state model in `src/lib/reading.ts`
2. extend shared content helpers needed by books and reader pages
3. build the dedicated `/books/` and `/about/` routes
4. upgrade header and book metadata components
5. implement the chapter reader toolbar and directory interactions
6. wire continue-reading behavior into homepage and book pages
7. finalize responsive styling
8. verify build output and reader-structure coverage

This order keeps shared rules ahead of UI polish and prevents the reader controls from inventing state ad hoc.

## Acceptance Criteria

The third subproject is complete when all of the following are true:

- `/books/` exists and lists all public books
- `/about/` exists and explains project, AI use, and copyright boundary
- the site header exposes the main public routes
- book detail pages present richer metadata and reading entry points
- chapter pages include a working reader toolbar
- theme, font size, line height, and width settings persist locally
- homepage and book pages can surface continue-reading links when local progress exists
- chapter pages remain readable without client-side JavaScript
- mobile layouts do not let toolbar or directory UI cover the chapter body
- full build and tests still pass

## Non-Goals For This Spec

This spec intentionally does not define:

- a public prompt center
- deployment configuration
- comment systems
- cross-device reading sync
- server-side personalization
- advanced analytics
- full SEO overhaul

Those belong to later specs.

## Implementation Handoff Intent

After this spec is approved, the next artifact should be an implementation plan for this reader-experience subproject only.

That plan should stay tightly scoped to:

- `/books/`
- `/about/`
- upgraded book and chapter pages
- reader toolbar state
- continue-reading behavior
- associated tests and styling
