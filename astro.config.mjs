// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import rehypeA11y from "./src/utils/rehype-a11y.mjs";

// https://astro.build/config
// Dominio propio: juferoga.pro  ->  site en la raíz (base "/")
export default defineConfig({
  site: "https://juferoga.pro",
  base: "/",
  trailingSlash: "ignore",
  integrations: [sitemap()],
  markdown: { rehypePlugins: [rehypeA11y] },
  build: {
    assets: "_astro",
  },
});
