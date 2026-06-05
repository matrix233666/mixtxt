# MixTXT Foundation Design

## Overview

This spec defines the first implementation subproject for MixTXT, based on the approved direction:

- Build in stages instead of attempting the full product in one pass.
- Prioritize a balanced minimum closed loop for both author and reader workflows.
- Follow the Astro + Pages CMS design document as the primary source, while allowing small engineering adjustments when required by current tool versions or repo reality.
- Include basic Pages CMS integration in the first subproject, but do not let CMS polish delay the core site foundation.

The result of this subproject is not the final production site. It is the first stable foundation: a working static content application with correct content rules, a browseable reading flow, and a CMS-ready content structure.

## Subproject Goal

Deliver a minimum working foundation that supports:

- structured content for site, books, chapters, releases, and prompts
- author editing through local files and basic Pages CMS configuration
- public browsing from homepage to book page to chapter page
- safe filtering so unpublished or hidden content does not leak into public output
- repeatable validation and build workflows

## In Scope

This subproject includes:

1. Astro project initialization and baseline configuration
2. Repository structure aligned to the approved Astro design
3. `src/data/site.json`
4. Astro Content Collections for:
   - `books`
   - `chapters`
   - `releases`
   - `prompts`
5. Shared content query helpers in `src/lib/content.ts`
6. A content validation script in `scripts/validate-content.mjs`
7. Example content for all core collections
8. Basic Pages CMS configuration in `.pages.yml`
9. Public site pages for:
   - homepage
   - book detail page
   - chapter reading page
   - 404 page
10. Core layouts and UI components needed for the reading flow
11. Basic reading settings scaffolding appropriate for the first chapter-reader version
12. Build and validation commands that run successfully end to end

## Out Of Scope

This subproject does not include:

- Pagefind search
- RSS output
- sitemap generation
- Cloudflare Pages production deployment integration
- advanced reading persistence features
- user accounts
- comments, likes, or bookmarks
- paid content
- database-backed features
- online AI generation workflows
- runtime backend APIs

These remain later-stage work and must not reshape the first subproject architecture.

## Product Boundary

The site is a single-author static novel creation and reading application.

- Authors maintain content in Git-backed files.
- Readers access public content through static pages.
- Git is the source of truth for content history.
- Static build output is the only public runtime requirement.

This subproject is considered successful when the site already behaves like a real product foundation, not a visual demo:

- content is structured and validated
- public pages are navigable
- unpublished content is safely excluded
- sample books and chapters can be browsed immediately after setup

## Reader Journey

The primary public reading flow is intentionally narrow:

1. Homepage
2. Book page
3. Chapter page
4. Prev/next chapter navigation

This flow is the center of the first release foundation. Secondary discovery surfaces such as search, tags, feeds, and editorial pages stay outside the primary implementation path for now.

## Information Architecture

The public information architecture for this subproject is:

- `Homepage`
  - site identity
  - recent updates
  - book entry points
- `Book Page`
  - cover
  - title
  - metadata
  - summary
  - chapter list
- `Chapter Page`
  - chapter metadata
  - reading content
  - minimal reading controls
  - previous/next navigation
- `404 Page`
  - graceful dead-end handling

`Releases` and `prompts` exist as structured content in this phase, but they are not major reader-facing destinations yet.

## Repository Structure

The first subproject should use this structure:

```text
mixtxt/
├── public/
│   ├── covers/
│   ├── images/
│   │   └── chapters/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── AppFooter.astro
│   │   ├── AppHeader.astro
│   │   ├── BookCard.astro
│   │   ├── ChapterList.astro
│   │   └── ChapterNav.astro
│   ├── content/
│   │   ├── books/
│   │   ├── chapters/
│   │   ├── prompts/
│   │   └── releases/
│   ├── data/
│   │   └── site.json
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   ├── BookLayout.astro
│   │   └── ReaderLayout.astro
│   ├── lib/
│   │   ├── content.ts
│   │   ├── reading.ts
│   │   └── site.ts
│   ├── pages/
│   │   ├── 404.astro
│   │   ├── index.astro
│   │   └── books/
│   │       ├── [book].astro
│   │       └── [book]/
│   │           └── [chapter].astro
│   ├── styles/
│   │   ├── global.css
│   │   ├── reader.css
│   │   └── tokens.css
│   └── content.config.ts
├── scripts/
│   └── validate-content.mjs
├── .pages.yml
├── astro.config.mjs
└── package.json
```

Key constraints:

- `site.json` remains outside Astro Content Collections.
- `books`, `chapters`, `releases`, and `prompts` remain separate collections.
- Public routing stays minimal in this phase.
- Validation remains part of the build boundary, not a later add-on.

## Content Model

The content model includes five sources:

1. `src/data/site.json`
2. `src/content/books/*.json`
3. `src/content/chapters/*.md`
4. `src/content/releases/*.md`
5. `src/content/prompts/*.md`

### Core Public Content

The public reading experience depends primarily on:

- `books`
- `chapters`

### Supporting Structured Content

These are modeled now for future continuity, but not expanded into major public experiences yet:

- `releases`
- `prompts`

## Content Rules

The following rules are hard requirements for the first subproject:

1. A book is public only when `visibility === "public"`.
2. A chapter is public only when `status === "published"`.
3. A published chapter must not appear publicly if its parent book is not public.
4. If `copyrightStatus === "private-draft"`, the book must be hidden.
5. If `copyrightStatus === "unknown"`, the book must not be public.
6. Public pages must consume shared query helpers instead of implementing their own filtering rules.

These constraints must be enforced consistently across validation and runtime page generation.

## Shared Query Layer

All public data access should flow through `src/lib/content.ts`.

This layer should own:

- filtering public books
- filtering published chapters
- sorting chapter order
- sorting recent updates
- resolving book-by-slug lookups
- building previous/next chapter navigation
- collecting tags from public books only

Page files and display components must not contain one-off filtering logic for visibility or publication state.

## Validation Boundary

`scripts/validate-content.mjs` is part of the product safety boundary for this project.

At minimum it must validate:

- slug format
- three-digit chapter numbers
- referenced book existence for every chapter
- uniqueness of `books.slug`
- uniqueness of `chapterNo` within a book
- uniqueness of `chapter.slug` within a book
- legality of `copyrightStatus` and `visibility`
- legality of public chapter publication under a hidden or non-public book
- consistency between `site.baseUrl` and Astro site configuration

Validation failures must fail the content check and block the build.

## Pages CMS Boundary

The first subproject includes Pages CMS at the configuration level.

That means:

- `.pages.yml` must support editing the defined content model
- authors should be able to create and edit core entries with the approved structure
- the CMS configuration should respect filename patterns and field constraints where practical

This phase does not require a highly polished editorial experience. It requires a reliable baseline integration that matches the content model and does not diverge from the schema.

## Page Responsibilities

### Homepage

Responsible for:

- establishing site identity
- showing book entry points
- highlighting recent updates

Not responsible for:

- advanced discovery tools
- search UI
- tag browsing

### Book Page

Responsible for:

- presenting one book
- showing metadata and summary
- rendering the chapter list in reading order

Not responsible for:

- editing workflows
- release-note browsing

### Chapter Page

Responsible for:

- rendering the chapter body
- showing minimal context around the chapter
- supporting continuous reading via previous/next navigation
- exposing basic reader settings scaffolding

Not responsible for:

- advanced social features
- complex reader analytics

## Layout And Component Boundaries

### Layouts

- `BaseLayout.astro`
  - global shell
  - head metadata basics
  - shared header/footer mounting
- `BookLayout.astro`
  - book metadata presentation structure
  - chapter list placement
- `ReaderLayout.astro`
  - chapter-reading shell
  - reading-width and control regions

### Components

- `AppHeader.astro`
  - site-level navigation
- `AppFooter.astro`
  - site-level footer
- `BookCard.astro`
  - reusable book entry block
- `ChapterList.astro`
  - chapter list rendering
- `ChapterNav.astro`
  - previous/next navigation

Component rule:

- components display already-filtered public data
- components do not own content visibility decisions

## Styling Direction

The first subproject should optimize for readability and calm utility rather than decorative marketing design.

The UI should feel like a focused content application:

- strong reading hierarchy
- restrained visual language
- mobile-friendly spacing
- clear navigation
- minimal distraction around chapter content

The chapter page should emphasize the reading column and continuity of reading over feature density.

## Technical Boundary

The implementation must stay within a static-first architecture:

- no database
- no server API layer
- no authentication system
- no runtime dependency on AI services
- no heavy client state library

Small client-side state for reader preferences is acceptable if kept local and scoped to the reading experience.

## Testing Strategy

The first subproject should validate three layers.

### 1. Content Constraint Validation

Validate the structure and rules around:

- schema shape
- slug correctness
- chapter numbering
- parent-child references
- publication visibility rules

### 2. Query Logic Validation

Validate helper behavior in `src/lib/content.ts`, including:

- hidden books excluded from public results
- unpublished chapters excluded from public results
- chapter navigation order is correct
- chapters under non-public books do not surface publicly

### 3. Page Build Verification

Validate that Astro can generate the key public pages successfully:

- homepage
- book pages
- chapter pages
- 404 page

The phase does not require a heavy end-to-end suite, but it does require repeatable build confidence.

## Delivery Sequence

Implementation planning should follow this order:

1. initialize Astro and core configuration
2. create directory structure and content schema
3. add example content and site config
4. build the shared content query layer
5. write failing tests for validation and query behavior
6. implement validation script and query logic
7. build layouts and shared UI components
8. build homepage, book page, chapter page, and 404
9. add `.pages.yml`
10. verify `dev`, `validate`, and `build` flows

This order protects the content boundary before deeper UI work and still delivers a visible minimum closed loop early.

## Acceptance Criteria

The first subproject is complete when all of the following are true:

- the repo contains the approved content structure
- content schema and validation rules are implemented
- sample data exists and passes validation
- the public reading flow from homepage to chapter page works
- hidden books and unpublished chapters do not appear publicly
- Pages CMS configuration exists and matches the structured content model
- the project can be validated and built successfully

## Non-Goals For This Spec

This spec intentionally does not define:

- final production deployment steps
- the full search experience
- public release pages
- public prompt-library pages
- future monetization or community features

Those belong to later specs and later plans.

## Implementation Handoff Intent

After this spec is approved, the next artifact should be an implementation plan for this subproject only.

That plan should remain tightly scoped to the approved foundation and should not silently expand into later-phase features.
