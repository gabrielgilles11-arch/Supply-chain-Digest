import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateAnalysis, parseAnalysisResponse } from "../analysis.mjs";

describe("parseAnalysisResponse", () => {
  it("parses a well-formed JSON response", () => {
    const text = JSON.stringify({ outlook: "Calm for now.", themeHeadlines: { both: "", minerals: "", friction: "" }, storyBlurbs: {} });
    expect(parseAnalysisResponse(text)).toMatchObject({ outlook: "Calm for now." });
  });

  it("strips a markdown code fence the model wasn't supposed to add", () => {
    const text = "```json\n" + JSON.stringify({ outlook: "x", themeHeadlines: {}, storyBlurbs: {} }) + "\n```";
    expect(parseAnalysisResponse(text)).toMatchObject({ outlook: "x" });
  });

  it("throws on a response missing required fields", () => {
    expect(() => parseAnalysisResponse(JSON.stringify({ outlook: "x" }))).toThrow();
  });
});

describe("generateAnalysis", () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  const originalFetch = global.fetch;

  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalKey;
    global.fetch = originalFetch;
  });

  it("returns null without ever calling the network when no API key is set", async () => {
    global.fetch = vi.fn();
    const result = await generateAnalysis({ ranked: [{ item: { title: "x" }, scored: { tags: [] } }], history: [] });
    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns null with no qualifying items even if a key is set", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    global.fetch = vi.fn();
    const result = await generateAnalysis({ ranked: [], history: [] });
    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("falls back to null instead of throwing when the API call fails", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    global.fetch = vi.fn().mockRejectedValue(new Error("network down"));
    const result = await generateAnalysis({ ranked: [{ item: { title: "x" }, scored: { tags: [] } }], history: [] });
    expect(result).toBeNull();
  });
});
