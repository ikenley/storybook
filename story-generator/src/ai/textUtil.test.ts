import { describe, expect, it } from "vitest";
import { createPrompt, getBaseUrl, getFileName } from "./textUtil.ts";

describe("getFileName", () => {
  it("replaces spaces with hyphens and appends .png", () => {
    expect(getFileName("the fish danced")).toBe("the-fish-danced.png");
  });

  it("strips punctuation that is not URL-safe", () => {
    expect(getFileName("Hello, world! (part 2)")).toBe(
      "Hello-world-part-2.png",
    );
  });

  it("preserves case", () => {
    expect(getFileName("The Fish")).toBe("The-Fish.png");
  });
});

describe("getBaseUrl", () => {
  it("builds a lowercased, hyphenated path under /storybook", () => {
    expect(getBaseUrl("The Great Adventure")).toBe(
      "/storybook/the-great-adventure",
    );
  });

  it("drops apostrophes and other unsafe characters", () => {
    expect(getBaseUrl("Pat's Big Day!")).toBe("/storybook/pats-big-day");
  });
});

describe("createPrompt", () => {
  const lines = ["Page one text.", "Page two text."];

  it("builds a cover prompt that omits the page lines", () => {
    const prompt = createPrompt(
      "The Fish",
      "a dancing fish",
      "surrealism",
      lines,
      "Page one text.",
      true,
    );
    expect(prompt).toContain("cover");
    expect(prompt).toContain("The Fish");
    expect(prompt).toContain("surrealism");
    expect(prompt).not.toContain("Page two text.");
  });

  it("builds a page prompt that includes full context and the target line", () => {
    const prompt = createPrompt(
      "The Fish",
      "a dancing fish",
      "surrealism",
      lines,
      "Page two text.",
      false,
    );
    expect(prompt).toContain("Page one text. Page two text.");
    expect(prompt).toContain("'Page two text.'");
    expect(prompt).toContain("surrealism");
  });

  // Both branches rely on this instruction to keep text out of generated art.
  it.each([true, false])(
    "suppresses text in the image (isCover=%s)",
    (isCover) => {
      const prompt = createPrompt("T", "d", "note", lines, "line", isCover);
      expect(prompt.toLowerCase()).toContain("not include text");
    },
  );
});
