import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { ensureSiteBuilt } from "./ensure-built";

let distDir: string;

function getXmlTagContents(xml: string, tagName: string) {
  const pattern = new RegExp(`<${tagName}>([^<]+)</${tagName}>`, "g");
  return [...xml.matchAll(pattern)].map((match) => match[1]);
}

describe("distribution outputs build", () => {
  beforeAll(async () => {
    distDir = await ensureSiteBuilt();
  });

  it("builds rss.xml with only public updates", () => {
    const rssXml = fs.readFileSync(path.join(distDir, "rss.xml"), "utf8");
    const itemTitles = getXmlTagContents(rssXml, "title").slice(1).sort();
    const itemLinks = getXmlTagContents(rssXml, "link").slice(1).sort();

    expect(rssXml).toContain("<title>MixTXT RSS</title>");
    expect(itemTitles).toEqual(["楔子", "黄巾初起"]);
    expect(itemLinks).toEqual([
      "https://mixtxt.example.com/books/sanguo-scifi/huangjin/",
      "https://mixtxt.example.com/books/sanguo-scifi/prologue/"
    ]);
  });

  it("builds sitemap.xml with only public routes", () => {
    const sitemapXml = fs.readFileSync(path.join(distDir, "sitemap.xml"), "utf8");
    const urls = getXmlTagContents(sitemapXml, "loc").sort();
    const expectedUrls = [
      "https://mixtxt.example.com/",
      "https://mixtxt.example.com/about/",
      "https://mixtxt.example.com/books/",
      "https://mixtxt.example.com/books/sanguo-scifi/",
      "https://mixtxt.example.com/books/sanguo-scifi/huangjin/",
      "https://mixtxt.example.com/books/sanguo-scifi/prologue/",
      "https://mixtxt.example.com/releases/",
      "https://mixtxt.example.com/search/",
      "https://mixtxt.example.com/tags/AI%E6%94%B9%E7%BC%96/",
      "https://mixtxt.example.com/tags/%E4%B8%89%E5%9B%BD/",
      "https://mixtxt.example.com/tags/%E7%A7%91%E5%B9%BB/"
    ].sort();

    expect(urls).toEqual(expectedUrls);
  });
});
