import type { APIRoute } from "astro";
import { getPublicSitemapEntries } from "../lib/content";
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
  const entries = await getPublicSitemapEntries();
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map((entry) => {
      const loc = new URL(entry, site.baseUrl).toString();
      return `<url><loc>${escapeXml(loc)}</loc></url>`;
    }),
    "</urlset>"
  ].join("");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
};
