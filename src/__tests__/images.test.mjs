import { describe, it, expect } from "vitest";
import { extractImageUrl } from "../images.mjs";

describe("extractImageUrl", () => {
  it("extracts og:image with property before content", () => {
    const html = `<html><head><meta property="og:image" content="https://example.com/pic.jpg"></head></html>`;
    expect(extractImageUrl(html, "https://example.com/article")).toBe("https://example.com/pic.jpg");
  });

  it("extracts og:image with content before property", () => {
    const html = `<html><head><meta content="https://example.com/pic2.jpg" property="og:image"></head></html>`;
    expect(extractImageUrl(html, "https://example.com/article")).toBe("https://example.com/pic2.jpg");
  });

  it("falls back to twitter:image when there's no og:image", () => {
    const html = `<html><head><meta name="twitter:image" content="https://example.com/tw.jpg"></head></html>`;
    expect(extractImageUrl(html, "https://example.com/article")).toBe("https://example.com/tw.jpg");
  });

  it("resolves a relative image URL against the page URL", () => {
    const html = `<html><head><meta property="og:image" content="/media/pic.jpg"></head></html>`;
    expect(extractImageUrl(html, "https://example.com/section/article")).toBe("https://example.com/media/pic.jpg");
  });

  it("returns null when no image meta tag is present", () => {
    const html = `<html><head><title>No image here</title></head></html>`;
    expect(extractImageUrl(html, "https://example.com/article")).toBeNull();
  });
});
