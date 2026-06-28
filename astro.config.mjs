// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
// Dominio propio: juferoga.pro  ->  site en la raíz (base "/")
export default defineConfig({
  site: "https://juferoga.pro",
  base: "/",
  trailingSlash: "ignore",
  build: {
    assets: "_astro",
  },
});
