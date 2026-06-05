import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { ensureSiteBuilt } from "./ensure-built";

let distDir: string;

describe("tag page build", () => {
  beforeAll(async () => {
    distDir = await ensureSiteBuilt();
  });

  it("builds the public tag page", () => {
    const html = fs.readFileSync(
      path.join(distDir, "tags", "科幻", "index.html"),
      "utf8"
    );

    expect(html).toContain("科幻");
    expect(html).toContain("三国演义：星火纪元");
    expect(html).not.toContain("Hidden Book");
  });
});
