import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { ensureSiteBuilt } from "./ensure-built";

let distDir: string;

describe("built routes", () => {
  beforeAll(async () => {
    distDir = await ensureSiteBuilt();
  });

  it("builds the homepage", () => {
    const html = fs.readFileSync(path.join(distDir, "index.html"), "utf8");
    expect(html).toContain("MixTXT");
    expect(html).toContain("三国演义：星火纪元");
  });

  it("builds the book page", () => {
    const html = fs.readFileSync(
      path.join(distDir, "books", "sanguo-scifi", "index.html"),
      "utf8"
    );
    expect(html).toContain("三国演义：星火纪元");
    expect(html).toContain("黄巾初起");
    expect(html).toContain("开始阅读");
  });

  it("builds the books index and about page", () => {
    const booksHtml = fs.readFileSync(path.join(distDir, "books", "index.html"), "utf8");
    const aboutHtml = fs.readFileSync(path.join(distDir, "about", "index.html"), "utf8");

    expect(booksHtml).toContain("书籍");
    expect(booksHtml).toContain("全部公开作品");
    expect(aboutHtml).toContain("关于 MixTXT");
    expect(aboutHtml).toContain("版权边界");
  });

  it("builds the chapter page", () => {
    const html = fs.readFileSync(
      path.join(distDir, "books", "sanguo-scifi", "huangjin", "index.html"),
      "utf8"
    );
    expect(html).toContain("黄巾初起");
    expect(html).toContain("巨鹿星区的夜空没有月亮");
    expect(html).toContain("data-reader-toolbar");
    expect(html).toContain("data-pagefind-body");
    expect(html).toContain("返回《三国演义：星火纪元》");
    expect(html).toContain("上一章：楔子");
  });
});
