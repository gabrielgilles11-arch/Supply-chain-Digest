import { describe, it, expect } from "vitest";
import { splitGoogleNewsTitle, isTrustedPublisher } from "../quality.mjs";

describe("splitGoogleNewsTitle", () => {
  it("splits the trailing publisher off a Google News title", () => {
    expect(splitGoogleNewsTitle("China curbs rare earth exports - Reuters")).toEqual({
      title: "China curbs rare earth exports",
      publisher: "Reuters",
    });
  });

  it("leaves a title with no publisher suffix untouched", () => {
    expect(splitGoogleNewsTitle("A headline with no dash suffix")).toEqual({
      title: "A headline with no dash suffix",
      publisher: null,
    });
  });

  it("splits on the last ' - ' when the headline itself contains a dash", () => {
    expect(splitGoogleNewsTitle("EU-China talks stall over minerals - Financial Times")).toEqual({
      title: "EU-China talks stall over minerals",
      publisher: "Financial Times",
    });
  });
});

describe("isTrustedPublisher", () => {
  it("accepts a known wire service or major outlet, case-insensitively", () => {
    expect(isTrustedPublisher("Reuters")).toBe(true);
    expect(isTrustedPublisher("the WALL STREET JOURNAL")).toBe(true);
  });

  it("rejects an unrecognized site", () => {
    expect(isTrustedPublisher("illustrateddailynews.com")).toBe(false);
  });

  it("rejects a null publisher", () => {
    expect(isTrustedPublisher(null)).toBe(false);
  });
});
