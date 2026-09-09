import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const shareImage = readFileSync(
  new URL("../public/harmony-hash-share-v2.png", import.meta.url),
);

describe("document share metadata", () => {
  it("uses the current first-party Harmony Hash identity across crawlers", () => {
    const imageUrl = "https://harmony.tonari.ai/harmony-hash-share-v2.png";
    const description = "Find the harmony inside every chord.";

    expect(indexHtml).toContain(`<link rel="canonical" href="https://harmony.tonari.ai/" />`);
    expect(indexHtml).toContain(`<meta name="description" content="${description}" />`);
    expect(indexHtml).toContain(`<meta property="og:description" content="${description}" />`);
    expect(indexHtml).toContain(`<meta name="twitter:description" content="${description}" />`);
    expect(indexHtml).toContain(`<meta property="og:image" content="${imageUrl}" />`);
    expect(indexHtml).toContain(`<meta name="twitter:image" content="${imageUrl}" />`);
    expect(indexHtml).toContain('meta property="og:image:alt"');
    expect(indexHtml).toContain('meta name="twitter:image:alt"');
    expect(indexHtml).not.toContain("https://tonari.ai/brand/og-harmony.png");
  });

  it("ships a valid 1200 by 630 PNG matching the declared dimensions", () => {
    expect(shareImage.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(shareImage.readUInt32BE(16)).toBe(1200);
    expect(shareImage.readUInt32BE(20)).toBe(630);
    expect(indexHtml).toContain('<meta property="og:image:width" content="1200" />');
    expect(indexHtml).toContain('<meta property="og:image:height" content="630" />');
  });
});
