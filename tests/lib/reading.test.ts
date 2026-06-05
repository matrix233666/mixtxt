import { describe, expect, it } from "vitest";
import {
  defaultReaderPreferences,
  mergeReaderPreferences,
  sanitizeReaderPreferences
} from "../../src/lib/reading";

describe("reader preferences", () => {
  it("provides stable defaults", () => {
    expect(defaultReaderPreferences.theme).toBe("system");
    expect(defaultReaderPreferences.fontSize).toBe(18);
  });

  it("sanitizes invalid persisted values", () => {
    expect(
      sanitizeReaderPreferences({
        theme: "neon" as never,
        fontSize: 4,
        lineHeight: 9
      })
    ).toEqual(defaultReaderPreferences);
  });

  it("merges a partial user override", () => {
    expect(mergeReaderPreferences({ fontSize: 20 }).fontSize).toBe(20);
    expect(mergeReaderPreferences({ fontSize: 20 }).theme).toBe("system");
  });
});
