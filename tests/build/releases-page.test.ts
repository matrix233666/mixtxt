import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { ensureSiteBuilt } from "./ensure-built";

let distDir: string;

describe("releases page build", () => {
  beforeAll(async () => {
    distDir = await ensureSiteBuilt();
  });

  it("builds the public releases page", () => {
    const releasesPagePath = path.join(distDir, "releases", "index.html");

    expect(fs.existsSync(releasesPagePath)).toBe(true);

    const html = fs.readFileSync(releasesPagePath, "utf8");

    expect(html).toContain("版本说明");
    expect(html).toContain("前两章试读版");
    expect(html).toContain("三国演义：星火纪元");
    expect(html).toContain("这一版完成了世界观设定、楔子和黄巾初起两章。");
    expect(html).toContain('<time datetime="2026-06-03">2026-06-03</time>');
    expect(html).not.toContain("Hidden Release");
  });
});
