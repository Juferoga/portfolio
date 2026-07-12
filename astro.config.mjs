// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
// Dominio propio: juferoga.pro  ->  site en la raíz (base "/")
export default defineConfig({
  site: "https://juferoga.pro",
  base: "/",
  trailingSlash: "ignore",
  integrations: [sitemap()],
  build: {
    assets: "_astro",
  },
});
