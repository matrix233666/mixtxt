import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const chapterNoPattern = /^[0-9]{3}$/;

const seoSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional()
  })
  .optional();

const books = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/books" }),
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
  loader: glob({ pattern: "*.md", base: "./src/content/chapters" }),
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
  loader: glob({ pattern: "*.md", base: "./src/content/releases" }),
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
  loader: glob({ pattern: "*.md", base: "./src/content/prompts" }),
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
