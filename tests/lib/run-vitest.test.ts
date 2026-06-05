import { describe, expect, it } from "vitest";
import { normalizeVitestArgs } from "../../scripts/vitest-args.mjs";

describe("normalizeVitestArgs", () => {
  it("adds --run when no explicit mode is provided", () => {
    expect(normalizeVitestArgs([])).toEqual(["--run"]);
    expect(normalizeVitestArgs(["tests/lib/site.test.ts"])).toEqual([
      "--run",
      "tests/lib/site.test.ts"
    ]);
  });

  it("preserves an explicit --run invocation", () => {
    expect(normalizeVitestArgs(["--run", "tests/lib/site.test.ts"])).toEqual([
      "--run",
      "tests/lib/site.test.ts"
    ]);
  });
});
