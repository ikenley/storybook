import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      // Report on all source, not just files that happen to have tests —
      // otherwise coverage reads 100% while most of src/ is untested.
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/local.ts"],
    },
  },
});
