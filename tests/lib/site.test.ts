import { describe, expect, it } from "vitest";
import { getSiteConfig } from "../../src/lib/site";

describe("getSiteConfig", () => {
  it("returns the configured base site metadata", () => {
    const site = getSiteConfig();

    expect(site.title).toBe("MixTXT");
    expect(site.baseUrl).toBe("https://mixtxt.example.com");
    expect(site.author).toBe("matrix");
  });
});
