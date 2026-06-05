# MixTXT Discovery And Distribution Design

## Overview

This spec defines the second implementation subproject for MixTXT.

The first subproject established the site foundation:

- typed content structure
- public content filtering
- validation workflow
- homepage, book page, chapter page, and 404
- a basic CMS-ready repository layout

The second subproject builds the next layer above that foundation:

- site search
- discovery pages
- distribution outputs
- crawler-facing public URL output

The goal is to turn MixTXT from a readable static content app into a discoverable static content site.

## Subproject Goal

Deliver a minimum discovery and distribution layer that supports:

- static full-text search over public site content
- tag-based browsing of public books
- release discovery for public books
- RSS output for public updates
- sitemap output for public URLs
- consistent public filtering across pages, feeds, and indexes

This subproject should preserve the first subproject’s core principle:

**discovery surfaces must not invent their own publication logic**

## In Scope

This subproject includes:

1. integrating `Pagefind` into the build workflow
2. adding a dedicated `/search` page
3. adding `/tags/[tag]` pages
4. adding a public `/releases` page
5. adding `rss.xml`
6. adding `sitemap.xml`
7. extending shared content-query helpers for discovery outputs
8. ensuring draft and hidden content do not enter:
   - Pagefind indexes
   - tag pages
   - releases page
   - RSS
   - sitemap

## Out Of Scope

This subproject does not include:

- advanced search filtering
- faceted search
- search result grouping by type with complex controls
- personalized recommendations
- deployment-platform integration details
- comments or social features
- user history or bookmarks
- runtime search backends
- analytics or search telemetry

These remain later-stage work.

## Product Boundary

The first subproject answered:

- how content is stored
- what content is public
- how readers move from homepage to chapter

The second subproject answers:

- how readers find content they did not directly navigate to
- how subscribers discover updates
- how crawlers receive the public URL set

It should still remain a static-first system with no runtime backend search service.

## Reader Discovery Paths

The main reading path remains unchanged:

1. homepage
2. book page
3. chapter page

This subproject adds complementary discovery paths:

1. search page
2. tag pages
3. releases page
4. RSS feed
5. sitemap

These are supporting routes. They must not fragment the public-content model or introduce separate publication rules.

## Information Architecture

After this subproject, the public site structure should be:

- `/`
- `/books/[book]`
- `/books/[book]/[chapter]`
- `/search`
- `/tags/[tag]`
- `/releases`
- `/rss.xml`
- `/sitemap.xml`

The homepage may include lightweight discovery entry points, but the main role of homepage content should remain editorially calm and reading-focused.

## Discovery Principles

### 1. Build-Time Public Filtering

Discovery outputs should be derived from the same public content that the site actually builds.

That means:

- hidden books do not appear in discovery
- unpublished chapters do not appear in discovery
- releases for hidden books do not appear publicly
- non-public content never reaches the search index

### 2. Shared Query Ownership

Discovery pages and outputs must consume shared query helpers instead of implementing page-specific filtering.

### 3. Static Search Boundary

Search remains static:

- Astro builds the public HTML
- Pagefind scans the built site output
- the frontend search page loads the generated index

This keeps the architecture aligned with the project’s static-first model.

## Public Filtering Rules

The following rules remain mandatory and must be reused by all discovery surfaces:

1. a book is public only when `visibility === "public"`
2. a chapter is public only when `status === "published"`
3. a published chapter under a non-public book must not appear publicly
4. a release is public only when its linked book is public
5. tags are derived only from public books
6. RSS contains public updates only
7. sitemap contains public URLs only
8. Pagefind indexes only publicly built pages

The second subproject should not loosen any rule already enforced by the first.

## Search Design

### Search Responsibilities

`/search` is responsible for:

- exposing a clear keyword search UI
- loading the static Pagefind index
- returning public books and chapters already present in built output
- linking readers into the main reading flow

`/search` is not responsible for:

- advanced filters
- personalized ranking
- complex sorting controls
- faceted browsing

### Search Architecture

The preferred flow is:

1. Astro builds public pages
2. build excludes non-public content from page generation
3. `pagefind --site dist` scans the public output
4. the search page uses the generated Pagefind assets

Because the index is generated from the already-public build output, hidden and draft content are naturally excluded.

## Tag Page Design

### Responsibilities

`/tags/[tag]` is responsible for:

- listing public books associated with a specific tag
- supporting topic-based discovery

### Boundaries

It is not responsible for:

- hierarchical taxonomies
- tag management tooling
- complex content analytics

Tags should remain a thin discovery surface over public books, not a new content subsystem.

## Releases Page Design

### Responsibilities

`/releases` is responsible for:

- listing public release notes tied to public books
- helping readers understand major update checkpoints

### Boundaries

It is not responsible for:

- replacing Git history
- diff visualization
- version-comparison tooling

It should remain editorially simple and publication-focused.

## RSS Design

### Responsibilities

`rss.xml` is responsible for:

- exposing a subscription feed of public updates
- enabling external feed readers to track site updates

### Boundaries

It must not include:

- draft updates
- hidden content
- private workflow items

The feed should represent the public publishing surface, not the authoring surface.

## Sitemap Design

### Responsibilities

`sitemap.xml` is responsible for:

- listing public canonical URLs
- helping search engines discover public pages

### Boundaries

It must not include:

- draft chapters
- hidden books
- non-public routes

Sitemap generation should stay explicit and filtered rather than assuming every route in the repo is public.

## Repository And File Impact

The second subproject is expected to extend the current structure with files such as:

```text
src/
├── components/
│   └── SearchBox.astro
├── lib/
│   ├── content.ts
│   ├── rss.ts
│   └── sitemap.ts
├── pages/
│   ├── search.astro
│   ├── releases/
│   │   └── index.astro
│   ├── tags/
│   │   └── [tag].astro
│   ├── rss.xml.ts
│   └── sitemap.xml.ts
└── styles/
    └── search.css
```

Exact filenames can flex slightly during implementation if Astro or current code patterns suggest a more natural local fit, but the responsibilities should remain stable.

## Shared Query Layer Extensions

The shared content layer should be extended rather than bypassed.

Expected additions include helpers such as:

- `getAllTags()`
- `getPublicReleases()`
- `getRecentPublicUpdates()` or equivalent feed-oriented helper
- `getPublicSitemapEntries()` or equivalent sitemap-oriented helper

These helpers should compose existing public-book and published-chapter logic rather than reimplementing it.

## Pagefind Integration

The build pipeline should be expanded so that:

1. content validates
2. Astro builds the public site
3. Pagefind indexes the resulting public output

This should be integrated through the repo’s build scripts and documented in implementation tasks.

The Pagefind assets should be treated as generated artifacts, not hand-maintained source files.

## Technical Boundary

This subproject must remain within a static-only discovery architecture:

- no server search API
- no database
- no search service vendor integration
- no user-auth-dependent search behavior

Pagefind and Astro outputs should be enough for this phase.

## Testing Strategy

Testing for this subproject should cover three areas.

### 1. Public Filter Integrity

Verify that:

- hidden books do not appear on tag pages
- draft chapters do not appear in RSS
- hidden-book releases do not appear on the releases page
- sitemap excludes non-public routes

### 2. Build Output Verification

Verify the build produces:

- `/search`
- `/tags/[tag]`
- `/releases`
- `/rss.xml`
- `/sitemap.xml`

And that they contain expected public content.

### 3. Search Index Boundary

Verify Pagefind indexes public content only and does not expose hidden or draft material.

This is the highest-risk area of the second subproject because it is easy to assume static search is safe while still accidentally generating public HTML for the wrong content.

## Delivery Sequence

Implementation planning should follow this order:

1. extend shared content queries for tags, releases, RSS, and sitemap data
2. integrate Pagefind into the build script
3. build the search page
4. build tag pages
5. build the releases page
6. build RSS output
7. build sitemap output
8. verify build artifacts, search boundaries, and public filtering consistency

This order keeps business rules ahead of UI and keeps discovery surfaces aligned with the same public-content source of truth.

## Acceptance Criteria

The second subproject is complete when all of the following are true:

- a search page exists and loads static Pagefind results
- tag pages build from public-book tags only
- a releases page exists for public release notes only
- RSS output is generated from public updates only
- sitemap output is generated from public URLs only
- hidden and draft content do not appear in discovery outputs
- Pagefind indexing is integrated into the build workflow
- full project build still succeeds cleanly

## Non-Goals For This Spec

This spec intentionally does not define:

- deployment-environment configuration
- robots policy details
- advanced search UX
- algorithmic ranking systems
- analytics
- editorial workflow redesign

Those belong to later specs.

## Implementation Handoff Intent

After this spec is approved, the next artifact should be an implementation plan for this discovery and distribution subproject only.

That plan should stay tightly scoped to search, tag discovery, releases, RSS, sitemap, and their shared public filtering rules.
