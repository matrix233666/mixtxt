import type { APIRoute } from "astro";
import { getRecentPublicUpdates } from "../lib/content";
import { getSiteConfig } from "../lib/site";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export const GET: APIRoute = async () => {
  const site = getSiteConfig();
  const updates = await getRecentPublicUpdates(20);
  const siteUrl = new URL("/", site.baseUrl).toString();
  const items = updates
    .map(({ chapter }) => {
      const link = new URL(
        `/books/${chapter.data.book}/${chapter.data.slug}/`,
        site.baseUrl
      ).toString();

      return [
        "<item>",
        `<title>${escapeXml(chapter.data.title)}</title>`,
        `<link>${escapeXml(link)}</link>`,
        `<guid>${escapeXml(link)}</guid>`,
        `<description>${escapeXml(chapter.data.summary)}</description>`,
        `<pubDate>${escapeXml(new Date(chapter.data.updatedAt).toUTCString())}</pubDate>`,
        "</item>"
      ].join("");
    })
    .join("");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "<channel>",
    "<title>MixTXT RSS</title>",
    `<link>${escapeXml(siteUrl)}</link>`,
    `<description>${escapeXml(site.description)}</description>`,
    items,
    "</channel>",
    "</rss>"
  ].join("");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
};
