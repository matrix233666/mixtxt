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
  });

  it("builds the chapter page", () => {
    const html = fs.readFileSync(
      path.join(distDir, "books", "sanguo-scifi", "huangjin", "index.html"),
      "utf8"
    );
    expect(html).toContain("黄巾初起");
    expect(html).toContain("巨鹿星区的夜空没有月亮");
  });
});
