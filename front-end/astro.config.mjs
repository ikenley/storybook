import { defineConfig } from "astro/config";

const base = process.env.BASE_URL;

// https://astro.build/config
export default defineConfig({
  site: "https://static.ikenley.com",
  base: base,
});
