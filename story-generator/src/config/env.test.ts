import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { optionalEnv, requireEnv } from "./env.ts";

const VAR = "STORYBOOK_TEST_VAR";

describe("requireEnv", () => {
  let original: string | undefined;

  beforeEach(() => {
    original = process.env[VAR];
    delete process.env[VAR];
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env[VAR];
    } else {
      process.env[VAR] = original;
    }
  });

  it("returns the value when set", () => {
    process.env[VAR] = "a-bucket";
    expect(requireEnv(VAR)).toBe("a-bucket");
  });

  it("throws when unset, naming the variable", () => {
    expect(() => requireEnv(VAR)).toThrow(VAR);
  });

  // An empty value is the same misconfiguration as an absent one, and is the
  // case the previous `process.env.X!` spelling silently let through.
  it("throws when set to an empty string", () => {
    process.env[VAR] = "";
    expect(() => requireEnv(VAR)).toThrow(VAR);
  });

  it("preserves whitespace-only values rather than treating them as absent", () => {
    process.env[VAR] = " ";
    expect(requireEnv(VAR)).toBe(" ");
  });
});

describe("optionalEnv", () => {
  it("returns the value when set", () => {
    process.env[VAR] = "present";
    expect(optionalEnv(VAR, "fallback")).toBe("present");
    delete process.env[VAR];
  });

  it("returns the fallback when unset", () => {
    delete process.env[VAR];
    expect(optionalEnv(VAR, "fallback")).toBe("fallback");
  });

  it("defaults the fallback to an empty string", () => {
    delete process.env[VAR];
    expect(optionalEnv(VAR)).toBe("");
  });

  // Distinguishes optionalEnv from requireEnv: `??` only falls back on
  // undefined, so a deliberately empty value is kept.
  it("keeps an empty string rather than falling back", () => {
    process.env[VAR] = "";
    expect(optionalEnv(VAR, "fallback")).toBe("");
    delete process.env[VAR];
  });
});
