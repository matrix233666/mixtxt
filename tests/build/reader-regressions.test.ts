import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ensureBuiltSource = path.resolve("tests", "build", "ensure-built.ts");

describe("reader regression guards", () => {
  it("recovers stale build locks before the default Vitest hook timeout", () => {
    const source = fs.readFileSync(ensureBuiltSource, "utf8");

    expect(source).toContain("const lockTtlMs = 8 * 1000;");
  });
});
